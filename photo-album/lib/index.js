import { fileURLToPath } from "node:url";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
//#region src/mount-once.ts
/**
* Host single-instance guard. The same plugin package can be installed both
* standalone and via an aggregator bundle; without this guard a second host
* apply would re-register the same webserver routes and settings namespace and
* fail the boot. mountOnce makes the second host apply a no-op for the
* lifetime of the first instance.
*
* The registry rides a global symbol so two module instances of the same
* package (npm copy vs repository link) still share one verdict. cordis
* `ctx.effect` runs its callback immediately and treats the callback's return
* value as the fiber disposer, so the unmarker is returned, not run.
*/
const MOUNTED = Symbol.for("dsh-photo-album.mounted");
function mountedSet() {
	const registry = globalThis;
	return registry[MOUNTED] ??= /* @__PURE__ */ new Set();
}
/**
* Wrap a cordis plugin apply so the package runs at most once per process.
* @param packageName - npm package identity shared by every install source.
* @param fn - the original plugin apply.
* @returns an apply of the same shape.
*/
function mountOnce(packageName, fn) {
	return ((...args) => {
		const mounted = mountedSet();
		if (mounted.has(packageName)) return;
		mounted.add(packageName);
		args[0]?.effect?.(() => () => {
			mounted.delete(packageName);
		});
		return fn(...args);
	});
}
//#endregion
//#region src/host/loopback.ts
/** IPv4 127/8 predicate (four decimal octets, first == 127). */
function isIPv4Loopback(v4) {
	const parts = v4.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Whether a socket remote address names the loopback range (127/8, ::1, IPv4-mapped). */
function isLoopbackAddress(address) {
	if (address === void 0) return false;
	const normalized = address.toLowerCase();
	if (normalized === "::1") return true;
	if (normalized.startsWith("::ffff:")) return isIPv4Loopback(normalized.slice(7));
	return isIPv4Loopback(normalized);
}
/** Whether a normalized URL hostname names the loopback authority. */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	return isIPv4Loopback(hostname);
}
/**
* Request-level trust fence: a loopback socket address AND a loopback Host
* header, plus browser same-origin markers. X-Forwarded-For is never trusted.
*/
function isLoopbackRequest(request) {
	if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL("http://" + host);
	} catch {
		return false;
	}
	if (!isLoopbackHostname(hostUrl.hostname)) return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
//#endregion
//#region src/core/album.ts
/**
* Photo scanning: list image files under a directory, resolve mime types, and
* guard an absolute path inside a root. Pure Node fs work, kept free of cordis
* so it can be unit-tested without a harness.
* @module dsh-photo-album/core/album
*/
/** Image extensions the album lists, lower-cased without the dot. */
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"svg",
	"avif",
	"bmp"
]);
/** Mime type by extension (the common browser-renderable set). */
const MIME_BY_EXT = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".avif": "image/avif",
	".bmp": "image/bmp"
};
/** Whether a filename carries an image extension the album lists. */
function isImageFile(name) {
	const dot = name.lastIndexOf(".");
	if (dot < 0) return false;
	return IMAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}
/** Content type for a file path; octet-stream for unknown extensions. */
function mimeForFile(file) {
	const dot = file.lastIndexOf(".");
	if (dot < 0) return "application/octet-stream";
	return MIME_BY_EXT[file.slice(dot).toLowerCase()] ?? "application/octet-stream";
}
/** Normalize a path for prefix comparison: `/` separators, no trailing slash. */
function normalizeForPrefix(value) {
	return value.replaceAll("\\", "/").replace(/\/+$/, "");
}
/** Whether `child` is inside (or equal to) `root`, separator-robust. */
function isPathInside(root, child) {
	if (root === "" || child === "") return false;
	const normRoot = normalizeForPrefix(root);
	const normChild = normalizeForPrefix(child);
	if (normChild === normRoot) return true;
	return normChild.startsWith(`${normRoot}/`);
}
/**
* Recursively list image files under `root`, newest first. Hidden entries
* (name starting with `.`) and symlinked directories are skipped. A
* non-recursive scan only reads the top level.
* @param root - directory to scan (must exist).
* @param recursive - descend into subdirectories.
* @returns image files, sorted by mtime descending.
*/
async function listImageFiles(root, recursive) {
	const files = [];
	const walk = async (dir, base) => {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name.startsWith(".")) continue;
			const abs = join(dir, entry.name);
			const rel = base === "" ? entry.name : `${base}/${entry.name}`;
			if (entry.isDirectory()) {
				if (recursive) await walk(abs, rel);
				continue;
			}
			if (!entry.isFile() || !isImageFile(entry.name)) continue;
			try {
				const info = await stat(abs);
				if (!info.isFile()) continue;
				files.push({
					relPath: rel,
					name: entry.name,
					mtime: info.mtimeMs,
					size: info.size
				});
			} catch {}
		}
	};
	await walk(root, "");
	files.sort((a, b) => b.mtime - a.mtime);
	return files;
}
/**
* Resolve a scanned root to an absolute path for a `/`-separated relative
* path, rejecting anything that escapes the root. Returns the absolute path or
* null when the child is outside the root.
* @param root - the scanned directory.
* @param relPath - `/`-separated relative path.
*/
function resolveInside(root, relPath) {
	if (relPath.includes("\0")) return null;
	const segments = relPath.split("/");
	if (segments.some((segment) => segment === ".." || segment === "" || segment === ".")) return null;
	if (relPath.startsWith("/") || /^[A-Za-z]:/.test(relPath)) return null;
	const abs = resolve(root, ...segments);
	return isPathInside(resolve(root), abs) ? abs : null;
}
//#endregion
//#region src/host/service.ts
/**
* Photo-album host service: resolves the current photo source (a configured
* directory, falling back to the built-in samples), scans it into an album
* view, and maps the opaque photo ids the browser holds back to absolute file
* paths the media route streams. No cordis imports — the routes wire it.
* @module dsh-photo-album/host/service
*/
/** Sample photo id prefix (`sample/<name>`). */
const SAMPLE_PREFIX = "sample/";
/** User photo id prefix (`user/<relpath>`). */
const USER_PREFIX = "user/";
const DEFAULT_TITLE = "生活相册";
/** Clamp a possibly-missing columns value into the valid 1–12 range. */
function clampColumns(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return 4;
	return Math.min(12, Math.max(1, Math.round(value)));
}
const NOT_FOUND$1 = {
	code: "not-found",
	message: "photo not found"
};
/**
* Expand `~` and environment-free home shorthand to an absolute path.
* The browser passes a raw string; `~` alone or a leading `~/` expands against
* the host user's home directory.
*/
function expandHome(dir) {
	if (dir === "~") return process.env.HOME ?? "";
	if (dir.startsWith("~/")) return join(process.env.HOME ?? "", dir.slice(2));
	return dir;
}
/**
* Scan one directory into photo entries, id-prefixed for the media route.
* @param root - absolute directory.
* @param prefix - `sample/` or `user/`.
* @param recursive - descend into subdirectories.
*/
async function scan(root, prefix, recursive) {
	return (await listImageFiles(root, recursive)).map((file) => ({
		id: `${prefix}${file.relPath}`,
		name: file.name,
		mtime: file.mtime,
		size: file.size
	}));
}
/**
* The album service. `getConfig` returns the live settings slice; `samplesDir`
* is the absolute path of the package's bundled sample photos.
*/
var PhotoAlbumService = class {
	getConfig;
	samplesDir;
	importsDir;
	stateStore;
	constructor(deps) {
		this.getConfig = deps.getConfig;
		this.samplesDir = deps.samplesDir;
		this.importsDir = deps.importsDir;
		this.stateStore = deps.stateStore;
	}
	/** The live settings slice (title/columns are forwarded to the browser). */
	config() {
		return this.getConfig();
	}
	/** Merge plugin-owned immediate choices over ordinary DSH settings. */
	async effectiveConfig() {
		const persisted = await this.stateStore?.read() ?? {};
		return {
			...this.getConfig(),
			...persisted
		};
	}
	/**
	* Build the album view. A configured `photosDir` is scanned first; an empty
	* result still counts as the user's (possibly empty) album, while an
	* unreadable directory falls back to samples with a warning. No directory
	* configured (or a fallback) serves the bundled samples.
	*/
	async list() {
		const config = await this.effectiveConfig();
		const title = config.title?.trim() !== "" && config.title !== void 0 ? config.title.trim() : DEFAULT_TITLE;
		const recursive = config.recursive ?? true;
		const columns = clampColumns(config.columns);
		const rawDir = config.photosDir?.trim();
		if (rawDir !== void 0 && rawDir !== "") {
			const dir = expandHome(rawDir);
			try {
				if ((await stat(dir)).isDirectory()) {
					const photos = await scan(dir, USER_PREFIX, recursive);
					return this.withBackground({
						title,
						source: "directory",
						directory: dir,
						photos,
						columns
					}, config.backgroundPhotoId);
				}
				return this.withBackground({
					title,
					source: "samples",
					directory: "",
					photos: await scan(this.samplesDir, SAMPLE_PREFIX, false),
					columns,
					warning: `照片路径不是目录：${dir}`
				}, config.backgroundPhotoId);
			} catch {
				return this.withBackground({
					title,
					source: "samples",
					directory: "",
					photos: await scan(this.samplesDir, SAMPLE_PREFIX, false),
					columns,
					warning: `照片目录不存在或无法读取：${dir}`
				}, config.backgroundPhotoId);
			}
		}
		return this.withBackground({
			title,
			source: "samples",
			directory: "",
			photos: await scan(this.samplesDir, SAMPLE_PREFIX, false),
			columns
		}, config.backgroundPhotoId);
	}
	/** Persist a user-selected directory outside the optional settings surface. */
	async setPhotosDir(path) {
		const normalized = path.trim();
		if (normalized === "") throw new Error("photo directory must not be empty");
		if (this.stateStore === void 0) throw new Error("album state store unavailable");
		await this.stateStore.update({
			photosDir: normalized,
			backgroundPhotoId: null
		});
		return this.list();
	}
	/**
	* Copy one browser-selected PNG/JPEG into the managed local library and make
	* it the active background. The original file is never modified.
	*/
	async importPhoto(photo) {
		if (this.stateStore === void 0 || this.importsDir === void 0) throw new Error("album import store unavailable");
		if (photo.data.length === 0) throw new Error("photo is empty");
		if (photo.data.length > 26214400) throw new Error("photo exceeds 25 MB limit");
		const original = photo.name.split(/[\\/]/).at(-1)?.normalize("NFKC") ?? "";
		const extension = extname(original).toLowerCase();
		const contentType = photo.contentType.split(";", 1)[0]?.trim().toLowerCase();
		const png = extension === ".png" && contentType === "image/png" && photo.data.subarray(0, 8).equals(Buffer.from([
			137,
			80,
			78,
			71,
			13,
			10,
			26,
			10
		]));
		const jpeg = (extension === ".jpg" || extension === ".jpeg") && contentType === "image/jpeg" && photo.data.length >= 3 && photo.data[0] === 255 && photo.data[1] === 216 && photo.data[2] === 255;
		if (!png && !jpeg) throw new Error("only valid PNG and JPG/JPEG files can be imported");
		const rawStem = original.slice(0, -extension.length).replace(/[\u0000-\u001f\u007f:]/g, "_").replace(/^\.+/, "").trim();
		const stem = (rawStem === "" ? "photo" : rawStem).slice(0, 120);
		await mkdir(this.importsDir, {
			recursive: true,
			mode: 448
		});
		let savedName = `${stem}${extension}`;
		let destination = join(this.importsDir, savedName);
		try {
			await writeFile(destination, photo.data, {
				flag: "wx",
				mode: 384
			});
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
			savedName = `${stem}-${randomUUID().slice(0, 8)}${extension}`;
			destination = join(this.importsDir, savedName);
			await writeFile(destination, photo.data, {
				flag: "wx",
				mode: 384
			});
		}
		try {
			await this.stateStore.update({
				photosDir: this.importsDir,
				backgroundPhotoId: `${USER_PREFIX}${savedName}`
			});
		} catch (error) {
			await unlink(destination).catch(() => {});
			throw error;
		}
		return this.list();
	}
	/** Persist a valid photo id, or null to restore the skin default. */
	async setBackgroundPhotoId(id) {
		if (this.stateStore === void 0) throw new Error("album state store unavailable");
		if (id === null) {
			await this.stateStore.update({ backgroundPhotoId: null });
			return this.list();
		}
		if (!(await this.list()).photos.some((photo) => photo.id === id)) throw new Error("photo not found");
		await this.stateStore.update({ backgroundPhotoId: id });
		return this.list();
	}
	/** Include a selection only while it still belongs to the current album. */
	withBackground(view, selected) {
		if (selected !== void 0 && view.photos.some((photo) => photo.id === selected)) return {
			...view,
			backgroundPhotoId: selected
		};
		return view;
	}
	/**
	* Resolve a photo id to the absolute file the media route streams. Sample ids
	* name a bare filename inside the samples directory; user ids name a
	* `/`-separated path that must resolve inside the configured directory.
	*/
	async resolveMedia(id) {
		const slash = id.indexOf("/");
		if (slash < 0) return {
			ok: false,
			error: NOT_FOUND$1
		};
		const prefix = id.slice(0, slash + 1);
		const rest = id.slice(slash + 1);
		if (prefix === "sample/") {
			if (rest.includes("/") || rest.includes("\\") || rest === "" || !isImageFile(rest)) return {
				ok: false,
				error: NOT_FOUND$1
			};
			const abs = join(this.samplesDir, rest);
			return this.statImage(abs);
		}
		if (prefix === "user/") {
			const rawDir = (await this.effectiveConfig()).photosDir?.trim();
			if (rawDir === void 0 || rawDir === "") return {
				ok: false,
				error: NOT_FOUND$1
			};
			const abs = resolveInside(expandHome(rawDir), rest);
			if (abs === null || !isImageFile(basename(abs))) return {
				ok: false,
				error: NOT_FOUND$1
			};
			return this.statImage(abs);
		}
		return {
			ok: false,
			error: NOT_FOUND$1
		};
	}
	/** Stat an image path; a missing/non-file path answers not-found. */
	async statImage(abs) {
		try {
			if (!(await stat(abs)).isFile()) return {
				ok: false,
				error: NOT_FOUND$1
			};
			return {
				ok: true,
				abs,
				mime: mimeForFile(abs)
			};
		} catch {
			return {
				ok: false,
				error: NOT_FOUND$1
			};
		}
	}
	/** Number of bundled sample photos (used by tests and diagnostics). */
	async sampleCount() {
		try {
			return (await readdir(this.samplesDir)).filter(isImageFile).length;
		} catch {
			return 0;
		}
	}
};
//#endregion
//#region src/host/routes.ts
/**
* /api/photo-album/* routes: one JSON endpoint for the album view and one
* media endpoint streaming photo bytes. Every request is loopback-fenced first,
* so a LAN-exposed deployment cannot enumerate or read photo files.
* @module dsh-photo-album/host/routes
*/
const OK = (value) => ({
	ok: true,
	value
});
const FAIL = (error) => ({
	ok: false,
	error
});
const BAD_REQUEST = {
	code: "bad-request",
	message: "malformed request"
};
const NOT_FOUND = {
	code: "not-found",
	message: "photo not found"
};
const MAX_JSON_BYTES = 4096;
/** Write one JSON envelope response. */
function json(res, envelope, status = 200) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(envelope));
}
/** Write the shared non-loopback rejection. */
function forbidden(res) {
	res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify({ error: "forbidden: loopback-only" }));
}
/** Stream one photo with an etag + no-cache so re-renders revalidate cheaply. */
async function serveMedia(service, req, url, res) {
	const id = url.searchParams.get("id");
	if (id === null || id === "") {
		json(res, FAIL(BAD_REQUEST), 400);
		return;
	}
	const resolved = await service.resolveMedia(id);
	if (!resolved.ok) {
		json(res, FAIL(resolved.error), 404);
		return;
	}
	const info = await stat(resolved.abs);
	const etag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
	const lastModified = new Date(info.mtimeMs).toUTCString();
	const headers = {
		"content-type": resolved.mime,
		"content-length": info.size,
		"cache-control": "no-cache",
		"x-content-type-options": "nosniff",
		etag,
		"last-modified": lastModified
	};
	if (req.headers["if-none-match"] === etag) {
		res.writeHead(304, headers);
		res.end();
		return;
	}
	if (req.method === "HEAD") {
		res.writeHead(200, headers);
		res.end();
		return;
	}
	res.writeHead(200, headers);
	try {
		await pipeline(createReadStream(resolved.abs), res);
	} catch {
		res.destroy();
	}
}
/** Read one deliberately small JSON request body. */
async function readJson(req) {
	if (req.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") throw new Error("content type must be application/json");
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.length;
		if (size > MAX_JSON_BYTES) throw new Error("request body too large");
		chunks.push(buffer);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
/** Read one bounded raw image request body. */
async function readImage(req) {
	const declared = Number(req.headers["content-length"] ?? 0);
	if (Number.isFinite(declared) && declared > 26214400) throw new Error("photo exceeds 25 MB limit");
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.length;
		if (size > 26214400) throw new Error("photo exceeds 25 MB limit");
		chunks.push(buffer);
	}
	return Buffer.concat(chunks);
}
/** Persist a background id (or null reset) and return the refreshed view. */
async function setBackground(service, req, res) {
	const body = await readJson(req);
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		json(res, FAIL(BAD_REQUEST), 400);
		return;
	}
	const id = body.id;
	if (id !== null && typeof id !== "string") {
		json(res, FAIL(BAD_REQUEST), 400);
		return;
	}
	try {
		json(res, OK(await service.setBackgroundPhotoId(id)));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		json(res, FAIL(message === "photo not found" ? NOT_FOUND : {
			code: "internal",
			message
		}), message === "photo not found" ? 404 : 500);
	}
}
/** Persist the picked photo directory and return the refreshed view. */
async function setDirectory(service, req, res) {
	const body = await readJson(req);
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		json(res, FAIL(BAD_REQUEST), 400);
		return;
	}
	const path = body.path;
	if (typeof path !== "string" || path.trim() === "") {
		json(res, FAIL(BAD_REQUEST), 400);
		return;
	}
	try {
		json(res, OK(await service.setPhotosDir(path)));
	} catch (error) {
		json(res, FAIL({
			code: "internal",
			message: error instanceof Error ? error.message : String(error)
		}), 500);
	}
}
/** Import a directly selected PNG/JPEG and immediately use it as background. */
async function importPhoto(service, req, url, res) {
	const name = url.searchParams.get("name");
	const contentType = req.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
	if (name === null || name === "" || name.length > 255 || contentType !== "image/png" && contentType !== "image/jpeg") {
		json(res, FAIL({
			code: "unsupported-format",
			message: "choose a PNG or JPG/JPEG image"
		}), 415);
		return;
	}
	try {
		const value = await service.importPhoto({
			name,
			contentType,
			data: await readImage(req)
		});
		json(res, OK(value));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const status = message.includes("25 MB") ? 413 : message.includes("valid PNG") ? 415 : message.includes("empty") ? 400 : 500;
		json(res, FAIL({
			code: status === 413 ? "too-large" : status === 415 ? "unsupported-format" : status === 400 ? "bad-request" : "internal",
			message
		}), status);
	}
}
/**
* Register the album routes on the shared webserver.
* @param ctx - context carrying the webServer service.
* @param service - the album service backing the routes.
* @returns disposers removing the routes.
*/
function registerAlbumRoutes(ctx, service) {
	const handler = (req, res) => {
		if (!isLoopbackRequest(req)) {
			forbidden(res);
			return;
		}
		const method = req.method ?? "GET";
		let pathname;
		try {
			pathname = new URL(req.url ?? "/", "http://photo-album.local").pathname;
		} catch {
			res.writeHead(400);
			res.end();
			return;
		}
		const url = new URL(req.url ?? "/", "http://photo-album.local");
		if (pathname === "/api/photo-album/list") {
			if (method !== "GET" && method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			service.list().then((value) => json(res, OK(value)), (error) => json(res, FAIL({
				code: "internal",
				message: error instanceof Error ? error.message : String(error)
			}), 500));
			return;
		}
		if (pathname === "/api/photo-album/media") {
			if (method !== "GET" && method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			serveMedia(service, req, url, res).catch(() => {
				if (!res.headersSent) json(res, FAIL(NOT_FOUND), 404);
			});
			return;
		}
		if (pathname === "/api/photo-album/background") {
			if (method !== "POST") {
				res.writeHead(405);
				res.end();
				return;
			}
			setBackground(service, req, res).catch(() => json(res, FAIL(BAD_REQUEST), 400));
			return;
		}
		if (pathname === "/api/photo-album/directory") {
			if (method !== "POST") {
				res.writeHead(405);
				res.end();
				return;
			}
			setDirectory(service, req, res).catch(() => json(res, FAIL(BAD_REQUEST), 400));
			return;
		}
		if (pathname === "/api/photo-album/import") {
			if (method !== "POST") {
				res.writeHead(405);
				res.end();
				return;
			}
			importPhoto(service, req, url, res);
			return;
		}
		res.writeHead(404);
		res.end();
	};
	const dispose = ctx.webServer.register({
		kind: "prefix",
		path: "/api/photo-album",
		handler
	});
	return () => {
		dispose();
	};
}
//#endregion
//#region src/host/state-store.ts
/**
* Small plugin-owned state document for choices that must work even when the
* optional DSH settings surface is unavailable. The file lives below the
* effective DSH_HOME and contains paths/opaque ids only, never photo bytes.
* @module dsh-photo-album/host/state-store
*/
/** Resolve the state file below the active DSH home. */
function defaultAlbumStatePath(environment = process.env, userHome = homedir()) {
	const configured = environment.DSH_HOME?.trim();
	const dshHome = configured !== void 0 && configured !== "" ? configured : join(userHome, ".dsh");
	return join(dshHome, "storages", "dsh-photo-album.json");
}
/** Managed local library for images selected through the file picker. */
function defaultAlbumImportsPath(environment = process.env, userHome = homedir()) {
	return join(dirname(defaultAlbumStatePath(environment, userHome)), "dsh-photo-album", "photos");
}
/** Narrow an untrusted parsed JSON value into the supported state fields. */
function decodeState(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
	const record = value;
	return {
		...typeof record.photosDir === "string" && record.photosDir.trim() !== "" ? { photosDir: record.photosDir } : {},
		...typeof record.backgroundPhotoId === "string" && record.backgroundPhotoId !== "" ? { backgroundPhotoId: record.backgroundPhotoId } : {}
	};
}
/** Atomic JSON store with serialized updates. */
var AlbumStateStore = class {
	filename;
	tail = Promise.resolve();
	constructor(filename) {
		this.filename = filename;
	}
	/** Read the last valid state; absence or malformed JSON safely means empty. */
	async read() {
		try {
			return decodeState(JSON.parse(await readFile(this.filename, "utf8")));
		} catch {
			return {};
		}
	}
	/** Merge one patch and durably replace the document before resolving. */
	update(patch) {
		let result = {};
		const task = this.tail.then(async () => {
			const next = { ...await this.read() };
			for (const [key, value] of Object.entries(patch)) if (value === null || value === void 0 || value === "") delete next[key];
			else next[key] = value;
			await this.write(next);
			result = next;
		});
		this.tail = task.catch(() => {});
		return task.then(() => result);
	}
	/** Write through a private temporary file and atomic rename. */
	async write(value) {
		const directory = dirname(this.filename);
		await mkdir(directory, {
			recursive: true,
			mode: 448
		});
		const temporary = join(directory, `.dsh-photo-album.${randomUUID()}.tmp`);
		try {
			await writeFile(temporary, `${JSON.stringify({
				version: 1,
				...value
			}, null, 2)}\n`, {
				encoding: "utf8",
				flag: "wx",
				mode: 384
			});
			await rename(temporary, this.filename);
		} finally {
			await unlink(temporary).catch(() => {});
		}
	}
};
//#endregion
//#region src/index.ts
/** Settings namespace the browser settings card edits (the Host registers it). */
const PHOTO_ALBUM_SETTINGS_NAMESPACE = "photo-album";
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 215;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const PHOTO_ALBUM_GUIDANCE = "本机已安装 dsh-photo-album 插件（DSH Web GUI 的生活相册）：侧边栏「相册」入口，点击后中间列切换为相册网格 + 灯箱大图。能力：可直接选择 PNG/JPG 文件、复制进插件本地图库并立即设为背景；也可读取本地照片目录（支持子目录递归、按修改时间倒序），或回退到内置示例照片。照片可在网格或灯箱中设为 DSH 背景并持久化，也可恢复皮肤默认背景；点照片打开灯箱（左右翻页、键盘方向键、ESC 关闭）。数据源为宿主进程经 /api/photo-album/* 路由提供（仅回环可访问）；照片目录/标题/列数等可在设置页「相册」中配置。用户提到「相册 / 生活照片 / 照片 / photo album」时即指本插件，请据此协作。";
/** Plugin config, validated by the same-named schemastery schema. */
const Config = z.object({
	photosDir: z.string().default(""),
	title: z.string().default("生活相册"),
	recursive: z.boolean().default(true),
	columns: z.number().step(1).min(1).max(12).default(4),
	backgroundPhotoId: z.string().default(""),
	enabled: z.boolean().default(true),
	announceToAgent: z.boolean().default(true)
});
/** Resolve the bundled sample-photos directory relative to this module. */
function samplesDir(importMetaUrl) {
	return fileURLToPath(new URL("../assets/samples", importMetaUrl));
}
/** Required services: the route registry and the prompt band. */
const inject = ["webServer", "systemPrompt"];
/**
* Mount the album service, its routes, and the announcement section.
* @param ctx - context carrying webServer and systemPrompt.
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
const apply = mountOnce("dsh-photo-album", applyImpl);
function applyImpl(ctx, config = {}) {
	let current = () => config ?? {};
	const service = new PhotoAlbumService({
		getConfig: () => current(),
		samplesDir: samplesDir(import.meta.url),
		importsDir: defaultAlbumImportsPath(),
		stateStore: new AlbumStateStore(defaultAlbumStatePath())
	});
	let disposeRoutes;
	let disposePrompt;
	const sync = () => {
		const value = current();
		const enabled = value.enabled ?? true;
		const announce = value.announceToAgent ?? true;
		if (disposeRoutes === void 0 && enabled) disposeRoutes = ctx.effect(() => {
			const dispose = registerAlbumRoutes(ctx, service);
			return () => dispose();
		}, "dsh-photo-album: /api/photo-album routes");
		else if (disposeRoutes !== void 0 && !enabled) {
			disposeRoutes();
			disposeRoutes = void 0;
		}
		if (disposePrompt === void 0 && enabled && announce) disposePrompt = ctx.effect(() => ctx.systemPrompt.section({
			name: "plugin:photo-album",
			order: SECTION_ORDER,
			text: PHOTO_ALBUM_GUIDANCE
		}), "dsh-photo-album: prompt section");
		else if (disposePrompt !== void 0 && (!enabled || !announce)) {
			disposePrompt();
			disposePrompt = void 0;
		}
	};
	installSettingsSection(ctx, settingsNamespace(PHOTO_ALBUM_SETTINGS_NAMESPACE), Config, config ?? {}, {
		setSource: (source) => {
			current = source;
		},
		onChange: sync
	});
	sync();
}
//#endregion
export { Config, PHOTO_ALBUM_GUIDANCE, PHOTO_ALBUM_SETTINGS_NAMESPACE, apply, inject };
