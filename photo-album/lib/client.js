window.__ModuleLoader__.load({
	id: "dsh-photo-album",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region src/client/controller.ts
		/** Small observable controller over the album view's open state. */
		var AlbumController = class {
			state = { open: false };
			listeners = /* @__PURE__ */ new Set();
			/** Current snapshot (stable reference until the next change). */
			getSnapshot() {
				return this.state;
			}
			/** Observe state changes; returns the disposer. */
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/** Toggle the album view. */
			toggle() {
				this.setState({ open: !this.state.open });
			}
			/** Open the album view. */
			open() {
				this.setState({ open: true });
			}
			/** Close the album view. */
			close() {
				this.setState({ open: false });
			}
			setState(next) {
				this.state = next;
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/api.ts
		/** Decode the shared JSON envelope without trusting the route response. */
		async function decodeAlbum(response) {
			try {
				const envelope = await response.json();
				if (typeof envelope !== "object" || envelope === null) return {
					ok: false,
					error: {
						code: "internal",
						message: "bad response"
					}
				};
				const record = envelope;
				if (record.ok === true) return {
					ok: true,
					value: record.value
				};
				return {
					ok: false,
					error: record.error ?? {
						code: "internal",
						message: "bad response"
					}
				};
			} catch {
				return {
					ok: false,
					error: {
						code: "internal",
						message: "bad response"
					}
				};
			}
		}
		/** Transport failure (fetch threw or the response was not JSON). */
		async function getAlbum() {
			let response;
			try {
				response = await fetch("/api/photo-album/list", { cache: "no-store" });
			} catch {
				return {
					ok: false,
					error: {
						code: "internal",
						message: "album route unavailable"
					}
				};
			}
			return decodeAlbum(response);
		}
		/** Persist one gallery-owned choice through the loopback Host route. */
		async function postAlbum(path, payload) {
			let response;
			try {
				response = await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				});
			} catch {
				return {
					ok: false,
					error: {
						code: "internal",
						message: "album route unavailable"
					}
				};
			}
			return decodeAlbum(response);
		}
		/** Media URL for one photo id. */
		function mediaUrl(id) {
			return `/api/photo-album/media?id=${encodeURIComponent(id)}`;
		}
		/** Fetch the current album view; never throws. */
		function fetchAlbum() {
			return getAlbum();
		}
		/** Persist the selected directory; the Host returns the refreshed album. */
		function persistAlbumDirectory(path) {
			return postAlbum("/api/photo-album/directory", { path });
		}
		/** Persist a background id; null restores the skin's bundled background. */
		function persistAlbumBackground(id) {
			return postAlbum("/api/photo-album/background", { id });
		}
		//#endregion
		//#region src/client/background-selection.ts
		/** Cross-plugin contract used by the album and presentation skins. */
		const PHOTO_ALBUM_BACKGROUND_EVENT = "dsh-photo-album:background-change";
		/** Reject path-like or unbounded values before they reach a media URL. */
		function isValidBackgroundPhotoId(value) {
			if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
			if (!value.startsWith("sample/") && !value.startsWith("user/")) return false;
			if (/[\u0000-\u001f\u007f\\]/.test(value)) return false;
			const rest = value.slice(value.indexOf("/") + 1);
			return rest.length > 0 && rest.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
		}
		/** Notify a loaded skin immediately after the persisted setting changes. */
		function emitBackgroundChange(change) {
			window.dispatchEvent(new CustomEvent(PHOTO_ALBUM_BACKGROUND_EVENT, { detail: change }));
		}
		/**
		* Re-announce the persisted selection after the Host album view becomes
		* available. This closes the cold-start race where a presentation skin can
		* mount before the photo-album route/client has finished starting.
		*/
		function emitBackgroundFromAlbumView(view) {
			const id = isValidBackgroundPhotoId(view.backgroundPhotoId) ? view.backgroundPhotoId : null;
			emitBackgroundChange({
				id,
				name: (id === null ? void 0 : view.photos.find((item) => item.id === id))?.name
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* dsh-photo-album locale dictionaries (zh/en).
		* @module dsh-photo-album/client/locales
		*/
		/** Dictionary namespace this package registers. */
		const NS = "photo-album";
		/** Chinese copy. */
		const zh = {
			"entry.label": "相册",
			"gallery.loading": "正在读取照片…",
			"gallery.empty": "这里还没有照片。",
			"gallery.samplesHint": "当前展示内置示例照片；点下方按钮选择你的照片文件夹，或到「设置 → 相册」里配置。",
			"gallery.chooseDirectory": "选择照片目录…",
			"gallery.chooseError": "选择目录失败：{error}",
			"gallery.directoryHint": "照片来自目录：{dir}",
			"gallery.warning": "提示：{warning}",
			"gallery.count": "{n} 张",
			"gallery.setBackground": "设为背景",
			"gallery.backgroundActive": "当前背景",
			"gallery.applyingBackground": "应用中…",
			"gallery.resetBackground": "恢复默认背景",
			"gallery.backgroundError": "无法更新背景：{error}",
			"lightbox.close": "关闭",
			"lightbox.prev": "上一张",
			"lightbox.next": "下一张",
			"lightbox.counter": "{current} / {total}",
			"settings.title": "相册",
			"settings.description": "配置照片来源与相册显示。",
			"settings.enabled": "启用相册",
			"settings.enabledHint": "关闭后隐藏侧边栏入口并停用相册路由。",
			"settings.titleField": "相册标题",
			"settings.titleFieldHint": "显示在相册顶部的标题，留空使用默认「生活相册」。",
			"settings.photosDir": "照片目录",
			"settings.photosDirHint": "本地照片文件夹的绝对路径（支持 ~/ 开头）；留空则展示内置示例照片。",
			"settings.browse": "浏览…",
			"settings.browseError": "无法打开目录选择器：{error}",
			"settings.recursive": "递归子目录",
			"settings.recursiveHint": "是否扫描子文件夹里的照片。",
			"settings.columns": "每行列数",
			"settings.columnsHint": "相册网格每行显示的照片列数（1–12）。",
			"settings.inherit": "继承",
			"settings.on": "开",
			"settings.off": "关",
			"settings.overridden": "已覆盖",
			"settings.reset": "恢复默认",
			"settings.notExposed": "当前 DSH 版本未向设置页暴露本插件的配置命名空间，表单不可用。可在 ~/.dsh/settings.yaml 里配置 photo-album 段。",
			"settings.readOnly": "当前部署的设置只读。",
			"settings.save": "保存",
			"settings.saving": "保存中…",
			"settings.discard": "放弃",
			"settings.unsaved": "未保存",
			"settings.saveFailed": "部署未接受这些值，已保留供你修改。",
			"settings.invalidNumber": "请输入 1–12 的整数，留空则使用默认值。"
		};
		/** English copy. */
		const en = {
			"entry.label": "Album",
			"gallery.loading": "Loading photos…",
			"gallery.empty": "No photos here yet.",
			"gallery.samplesHint": "Showing built-in sample photos; click the button below to choose your photos folder, or configure it in Settings → Album.",
			"gallery.chooseDirectory": "Choose photos directory…",
			"gallery.chooseError": "Could not choose a directory: {error}",
			"gallery.directoryHint": "Photos from: {dir}",
			"gallery.warning": "Note: {warning}",
			"gallery.count": "{n} photos",
			"gallery.setBackground": "Use as background",
			"gallery.backgroundActive": "Current background",
			"gallery.applyingBackground": "Applying…",
			"gallery.resetBackground": "Restore default background",
			"gallery.backgroundError": "Could not update the background: {error}",
			"lightbox.close": "Close",
			"lightbox.prev": "Previous",
			"lightbox.next": "Next",
			"lightbox.counter": "{current} / {total}",
			"settings.title": "Album",
			"settings.description": "Configure the photo source and album display.",
			"settings.enabled": "Enable the album",
			"settings.enabledHint": "When off, the sidebar entry hides and the album routes stop.",
			"settings.titleField": "Album title",
			"settings.titleFieldHint": "Title shown above the album; blank falls back to the default.",
			"settings.photosDir": "Photos directory",
			"settings.photosDirHint": "Absolute path to your photos folder (~/ prefix allowed); blank shows the built-in samples.",
			"settings.browse": "Browse…",
			"settings.browseError": "Could not open the directory picker: {error}",
			"settings.recursive": "Scan subdirectories",
			"settings.recursiveHint": "Whether to include photos inside subfolders.",
			"settings.columns": "Columns",
			"settings.columnsHint": "Grid columns per row (1–12).",
			"settings.inherit": "Inherit",
			"settings.on": "On",
			"settings.off": "Off",
			"settings.overridden": "Overridden",
			"settings.reset": "Reset to default",
			"settings.notExposed": "This DSH version does not expose the plugin's settings namespace to the configuration page. Configure the photo-album section in ~/.dsh/settings.yaml instead.",
			"settings.readOnly": "This deployment stores settings read-only.",
			"settings.save": "Save",
			"settings.saving": "Saving…",
			"settings.discard": "Discard",
			"settings.unsaved": "Unsaved",
			"settings.saveFailed": "The deployment did not accept these values; they were left for you to correct.",
			"settings.invalidNumber": "Enter a whole number 1–12, or leave blank for the default."
		};
		/**
		* Active dictionary, picked by the document language at call time. The
		* sidebar entry and gallery are DOM-injected surfaces with no framework locale
		* seat, so they resolve copy the same way as the task-board's injected surface.
		*/
		function dictionary() {
			return (typeof document !== "undefined" ? document.documentElement.lang : "zh").toLowerCase().startsWith("en") ? en : zh;
		}
		/** Translate a key with optional `{name}` template params. */
		function t(key, params) {
			let text = dictionary()[key] ?? key;
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		//#endregion
		//#region src/client/PhotoAlbum.tsx
		/**
		* The album gallery: a responsive photo grid plus a keyboard-navigable
		* lightbox. Fetches the album view from the host on mount and re-fetches each
		* time the view opens, so a settings change is picked up without a reload.
		* @module dsh-photo-album/client/PhotoAlbum
		*/
		/**
		* Render the album gallery.
		* @param props - the controller owning the view's open state and the pick deps.
		*/
		function AlbumGallery({ controller, deps }) {
			const [album, setAlbum] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [index, setIndex] = (0, react.useState)(null);
			const [choosing, setChoosing] = (0, react.useState)(false);
			const [chooseError, setChooseError] = (0, react.useState)(null);
			const [backgroundId, setBackgroundId] = (0, react.useState)(null);
			const [backgroundBusy, setBackgroundBusy] = (0, react.useState)(null);
			const [backgroundError, setBackgroundError] = (0, react.useState)(null);
			const load = (0, react.useCallback)(async () => {
				setLoading(true);
				const result = await fetchAlbum();
				if (result.ok) {
					setAlbum(result.value);
					setBackgroundId(result.value.backgroundPhotoId ?? null);
					emitBackgroundFromAlbumView(result.value);
					setError(null);
				} else {
					setAlbum(null);
					setError(result.error.message);
				}
				setLoading(false);
			}, []);
			(0, react.useEffect)(() => {
				load();
				return controller.subscribe(() => {
					if (controller.getSnapshot().open) load();
				});
			}, [controller, load]);
			(0, react.useEffect)(() => {
				if (index === null || album === null) return;
				const onKey = (event) => {
					if (event.key === "Escape") setIndex(null);
					else if (event.key === "ArrowRight") setIndex((prev) => prev === null ? prev : (prev + 1) % album.photos.length);
					else if (event.key === "ArrowLeft") setIndex((prev) => prev === null ? prev : (prev - 1 + album.photos.length) % album.photos.length);
				};
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("keydown", onKey);
				};
			}, [index, album]);
			const choose = (0, react.useCallback)(async () => {
				setChooseError(null);
				setChoosing(true);
				try {
					const path = await deps.pickDirectory();
					if (path !== null && path !== "") {
						await deps.setPhotosDir(path);
						await load();
					}
				} catch (err) {
					setChooseError(err instanceof Error ? err.message : String(err));
				} finally {
					setChoosing(false);
				}
			}, [deps, load]);
			const photos = album?.photos ?? [];
			const columns = album?.columns ?? 4;
			const showSamples = album?.source === "samples";
			const selectBackground = (0, react.useCallback)(async (id, name) => {
				setBackgroundError(null);
				setBackgroundBusy(id);
				try {
					await deps.setBackgroundPhotoId(id);
					setBackgroundId(id);
					emitBackgroundChange({
						id,
						name
					});
				} catch (err) {
					setBackgroundError(err instanceof Error ? err.message : String(err));
				} finally {
					setBackgroundBusy(null);
				}
			}, [deps]);
			const resetBackground = (0, react.useCallback)(async () => {
				setBackgroundError(null);
				setBackgroundBusy("");
				try {
					await deps.setBackgroundPhotoId("");
					setBackgroundId(null);
					emitBackgroundChange({ id: null });
				} catch (err) {
					setBackgroundError(err instanceof Error ? err.message : String(err));
				} finally {
					setBackgroundBusy(null);
				}
			}, [deps]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pa-album",
				"data-dsh-photoalbum-root": "",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "dsh-pa-album-header",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-pa-album-header-text",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
								className: "dsh-pa-album-title",
								children: album?.title ?? t("entry.label")
							}), album?.source === "directory" && album.directory !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-pa-album-subtitle",
								children: t("gallery.directoryHint", { dir: album.directory })
							}) : null]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-pa-album-actions",
							children: [
								backgroundId !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-pa-background-reset",
									disabled: backgroundBusy !== null,
									onClick: () => {
										resetBackground();
									},
									children: t("gallery.resetBackground")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-pa-album-count",
									children: t("gallery.count", { n: photos.length })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-pa-refresh",
									onClick: () => {
										load();
									},
									"aria-label": "refresh",
									children: "↻"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-pa-album-close",
									onClick: () => {
										controller.close();
									},
									"aria-label": t("lightbox.close"),
									children: "×"
								})
							]
						})]
					}),
					showSamples && !loading && error === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pa-samples-callout",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-pa-samples-text",
							children: t("gallery.samplesHint")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-pa-choose",
							disabled: choosing,
							onClick: () => {
								choose();
							},
							children: choosing ? "…" : t("gallery.chooseDirectory")
						})]
					}) : null,
					chooseError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-invalid",
						children: t("gallery.chooseError", { error: chooseError })
					}) : null,
					backgroundError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-invalid",
						children: t("gallery.backgroundError", { error: backgroundError })
					}) : null,
					album?.warning ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-warning",
						children: t("gallery.warning", { warning: album.warning })
					}) : null,
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-status",
						children: t("gallery.loading")
					}) : error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-status",
						children: error
					}) : photos.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pa-empty",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("gallery.empty") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-pa-choose",
							disabled: choosing,
							onClick: () => {
								choose();
							},
							children: choosing ? "…" : t("gallery.chooseDirectory")
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "dsh-pa-grid",
						style: { gridTemplateColumns: `repeat(${columns}, 1fr)` },
						children: photos.map((photo, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "dsh-pa-cell",
							"data-dsh-photoalbum-background-active": backgroundId === photo.id ? "" : void 0,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dsh-pa-photo-button",
								onClick: () => {
									setIndex(i);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: "dsh-pa-photo",
									src: mediaUrl(photo.id),
									alt: photo.name,
									loading: "lazy",
									decoding: "async"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dsh-pa-photo-name",
									children: photo.name
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-pa-set-background",
								disabled: backgroundBusy !== null || backgroundId === photo.id,
								onClick: () => {
									selectBackground(photo.id, photo.name);
								},
								children: backgroundBusy === photo.id ? t("gallery.applyingBackground") : backgroundId === photo.id ? t("gallery.backgroundActive") : t("gallery.setBackground")
							})]
						}, photo.id))
					}),
					index !== null && photos[index] !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pa-lightbox",
						role: "dialog",
						"aria-modal": "true",
						onClick: () => {
							setIndex(null);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dsh-pa-lightbox-stage",
								onClick: (event) => {
									event.stopPropagation();
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									className: "dsh-pa-lightbox-image",
									src: mediaUrl(photos[index].id),
									alt: photos[index].name
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "dsh-pa-lightbox-caption",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: photos[index].name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dsh-pa-lightbox-counter",
										children: t("lightbox.counter", {
											current: index + 1,
											total: photos.length
										})
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-pa-lightbox-nav dsh-pa-lightbox-prev",
								"aria-label": t("lightbox.prev"),
								onClick: (event) => {
									event.stopPropagation();
									setIndex((index - 1 + photos.length) % photos.length);
								},
								children: "‹"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-pa-lightbox-nav dsh-pa-lightbox-next",
								"aria-label": t("lightbox.next"),
								onClick: (event) => {
									event.stopPropagation();
									setIndex((index + 1) % photos.length);
								},
								children: "›"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-pa-lightbox-close",
								"aria-label": t("lightbox.close"),
								onClick: (event) => {
									event.stopPropagation();
									setIndex(null);
								},
								children: "×"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-pa-lightbox-background",
								disabled: backgroundBusy !== null || backgroundId === photos[index].id,
								onClick: (event) => {
									event.stopPropagation();
									selectBackground(photos[index].id, photos[index].name);
								},
								children: backgroundBusy === photos[index].id ? t("gallery.applyingBackground") : backgroundId === photos[index].id ? t("gallery.backgroundActive") : t("gallery.setBackground")
							})
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/gallery-mount.tsx
		/**
		* Gallery view mounting. The `conversation` slot is single-occupant, so the
		* album takes over the center column at the DOM level: a container is appended
		* inside the center column as an extra trailing child React never manages, and
		* a stylesheet rule hides the conversation content while the album is active.
		* Toggling is a data attribute on <html> — the conversation subtree underneath
		* stays mounted and stateful.
		* @module dsh-photo-album/client/gallery-mount
		*/
		const CONVERSATION_COLUMN_SELECTOR = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		const ACTIVE_ATTR = "data-dsh-photoalbum-active";
		/** Sibling panels' activation attributes, removed when this panel opens. */
		const OTHER_ACTIVE_ATTRS = ["data-dsh-taskboard-active", "data-dsh-ssh-active"];
		/** Cross-plugin activation event; detail is the activating panel name. */
		const ACTIVATE_EVENT = "dsh-panel-activate";
		const PANEL_NAME = "photoalbum";
		/** Find the center column, or undefined while the frame is not mounted. */
		function conversationColumn() {
			return document.querySelector(CONVERSATION_COLUMN_SELECTOR) ?? void 0;
		}
		/**
		* Mount the gallery React tree into the center column and bind its visibility
		* to the controller's open state.
		* @param controller - the album controller driving the view.
		* @param deps - host-facing pick deps (directory picker + plugin-state write).
		* @returns disposer unmounting the tree and restoring the column.
		*/
		function mountGallery(controller, deps) {
			let root;
			let container;
			const ensure = () => {
				if (container !== void 0) return;
				const column = conversationColumn();
				if (column === void 0) return;
				container = document.createElement("div");
				container.dataset.dshPhotoalbumView = "";
				column.appendChild(container);
				root = (0, react_dom_client.createRoot)(container);
				root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlbumGallery, {
					controller,
					deps
				}));
			};
			const waitObserver = new MutationObserver(() => {
				ensure();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const applyActive = () => {
				if (controller.getSnapshot().open) {
					for (const attr of OTHER_ACTIVE_ATTRS) document.documentElement.removeAttribute(attr);
					document.documentElement.setAttribute(ACTIVE_ATTR, "");
					document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }));
				} else document.documentElement.removeAttribute(ACTIVE_ATTR);
			};
			const onOtherActivate = (event) => {
				const detail = event.detail;
				if (detail !== void 0 && detail !== PANEL_NAME && controller.getSnapshot().open) controller.close();
			};
			const SIDEBAR_ROW_SELECTOR = "[class*=\"sessionRow\"], [class*=\"projectRow\"], [class*=\"searchResultRow\"], [class*=\"searchResultWorkspace\"], [class*=\"newSession\"]";
			const onClickSidebarRow = (event) => {
				if (!controller.getSnapshot().open) return;
				const target = event.target;
				if (target === null) return;
				if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.close();
			};
			document.addEventListener("click", onClickSidebarRow, true);
			document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
			const unsubscribe = controller.subscribe(applyActive);
			applyActive();
			ensure();
			return () => {
				document.removeEventListener("click", onClickSidebarRow, true);
				document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
				waitObserver.disconnect();
				unsubscribe();
				document.documentElement.removeAttribute(ACTIVE_ATTR);
				root?.unmount();
				root = void 0;
				container?.remove();
				container = void 0;
			};
		}
		/** Inline icon (matches the shell's 16px nav-icon look). */
		const ICON = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><circle cx="5.5" cy="6" r="1.3"/><path d="M2.5 12.5l3.4-3.4 2.3 2.3 2.1-2.1 3.2 3.2"/></svg>`;
		/** Find the sidebar shell root element, or undefined while not yet mounted. */
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			if (column === null) return void 0;
			return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
		}
		/** The New Session button (nested in the logo row on current shells). */
		function newSessionButton(root) {
			const nested = root.querySelector("button[class*=\"newSession\"]");
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
		}
		/** Build the entry row (a detached button). */
		function createEntry(controller) {
			const entry = document.createElement("button");
			entry.type = "button";
			entry.dataset.dshPhotoalbumEntry = "";
			entry.className = "dsh-pa-entry";
			entry.setAttribute("aria-label", t("entry.label"));
			entry.innerHTML = `<span class="dsh-pa-entry-icon">${ICON}</span><span class="dsh-pa-entry-label">${t("entry.label")}</span>`;
			entry.addEventListener("click", () => {
				controller.toggle();
			});
			return entry;
		}
		/** Re-insert the entry after the New Session row. */
		function placeEntry(root, entry) {
			const button = newSessionButton(root);
			if (button === void 0) return false;
			if (entry.parentElement !== root) {
				const row = button.closest("[class*=\"logoRow\"]");
				const base = row !== null && row.parentElement === root ? row : button;
				const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches("[data-dsh-photoalbum-entry], [data-dsh-taskboard-entry], [data-dsh-ssh-entry]"));
				const anchor = family.length > 0 ? family[0] : base.nextElementSibling;
				root.insertBefore(entry, anchor);
			}
			return true;
		}
		/**
		* Mount the sidebar entry, waiting for the shell to render and self-healing
		* on later React re-renders.
		* @param controller - the album controller the entry toggles.
		* @returns disposer removing the entry and its observers.
		*/
		function mountSidebarEntry(controller) {
			if (typeof document !== "undefined" && document.querySelector("[data-dsh-photoalbum-entry]") !== null) return () => {};
			const entry = createEntry(controller);
			let root;
			let placed = false;
			const tryPlace = () => {
				if (root !== void 0 && !root.isConnected) {
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				if (placed) {
					if (document.body.contains(entry)) return;
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				root ??= sidebarRoot();
				if (root === void 0) return;
				placed = placeEntry(root, entry);
				if (placed) rootObserver.observe(root, {
					childList: true,
					subtree: true
				});
			};
			const waitObserver = new MutationObserver(() => {
				tryPlace();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const rootObserver = new MutationObserver(() => {
				if (root === void 0 || !root.isConnected) {
					placed = false;
					tryPlace();
					return;
				}
				if (!root.contains(entry)) placed = placeEntry(root, entry);
			});
			const syncActive = () => {
				if (controller.getSnapshot().open) entry.dataset.active = "true";
				else delete entry.dataset.active;
			};
			const unsubscribe = controller.subscribe(syncActive);
			syncActive();
			tryPlace();
			return () => {
				waitObserver.disconnect();
				rootObserver.disconnect();
				unsubscribe();
				entry.remove();
			};
		}
		//#endregion
		//#region src/client/settings-form.ts
		/**
		* Staged form model behind the album settings card. A card stages what the
		* user types and writes it only on save; the settings write is a durable,
		* revision-fenced document mutation, so staging keeps what is on screen
		* exactly what a save would store.
		* @module dsh-photo-album/client/settings-form
		*/
		/** A free-text field; an empty draft clears the field. */
		function textField(field) {
			return {
				field,
				format: (value) => typeof value === "string" ? value : "",
				parse: (text) => {
					const trimmed = text.trim();
					return trimmed === "" ? { kind: "clear" } : {
						kind: "set",
						value: trimmed
					};
				}
			};
		}
		/** A whole- or decimal-number field. */
		function numberField(field, constraints = {}) {
			const { integer = false, min, max } = constraints;
			return {
				field,
				format: (value) => typeof value === "number" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					if (!Number.isFinite(parsed)) return void 0;
					if (integer && !Number.isInteger(parsed)) return void 0;
					if (min !== void 0 && parsed < min) return void 0;
					if (max !== void 0 && parsed > max) return void 0;
					return {
						kind: "set",
						value: parsed
					};
				}
			};
		}
		/** A boolean field, edited through 'true'/'false' draft text. */
		function booleanField(field) {
			return {
				field,
				format: (value) => typeof value === "boolean" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					if (trimmed === "true") return {
						kind: "set",
						value: true
					};
					if (trimmed === "false") return {
						kind: "set",
						value: false
					};
				}
			};
		}
		/**
		* Stages one card's edits over one settings namespace and writes them on save.
		* The Host is the only authority on whether a value was accepted, so a field
		* lands only when the read-back holds the staged value; a failed field keeps
		* its draft for correction.
		*/
		var CardForm = class {
			scope;
			specs = /* @__PURE__ */ new Map();
			staged = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			disposeScope;
			disposed = false;
			saving = false;
			failed = false;
			constructor(scope, specs) {
				this.scope = scope;
				for (const spec of specs) this.specs.set(spec.field, spec);
				this.disposeScope = scope.subscribe(() => {
					this.publish();
				});
			}
			/** Release the scope subscription and bound store listeners. */
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				this.disposeScope();
				this.listeners.clear();
			}
			/** Bind a projection of this form into a snapshot store. */
			bind(project) {
				const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
				this.listeners.add(() => {
					store.set(project());
				});
				return store;
			}
			/** Card-level state. */
			shell() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status !== "loading",
					exposed: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: this.staged.size > 0,
					invalid: this.plan().some((item) => item === void 0),
					saving: this.saving,
					failed: this.failed
				};
			}
			/** One field's state from the effective section and its staged draft. */
			field(field) {
				const spec = this.specOf(field);
				const staged = this.staged.get(field);
				if (staged === void 0) return {
					text: spec.format(this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			/** The actions the card's slot registration injects. */
			actions() {
				return {
					edit: (field, text) => {
						this.stage(field, {
							text,
							clear: false
						});
					},
					resetField: (field) => {
						this.stage(field, {
							text: this.specOf(field).format(this.baseValue(field)),
							clear: true
						});
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.publish();
					}
				};
			}
			async save() {
				if (this.staged.size === 0 || this.saving) return;
				const plan = this.plan();
				if (plan.some((item) => item === void 0)) return;
				const fields = new Set(this.staged.keys());
				this.saving = true;
				this.failed = false;
				this.publish();
				const landed = /* @__PURE__ */ new Set();
				for (const [field, write] of plan) if (write.kind === "clear") {
					await this.scope.unset(field);
					if (!this.stored(field)) landed.add(field);
				} else {
					await this.scope.set(field, write.value);
					if (this.userLayer()?.[field] === write.value) landed.add(field);
				}
				for (const field of fields) if (landed.has(field)) this.staged.delete(field);
				this.saving = false;
				this.failed = landed.size !== fields.size;
				this.publish();
			}
			/** Every staged edit a save would write; undefined entries block the save. */
			plan() {
				const plan = [];
				for (const [field, staged] of this.staged) {
					const spec = this.specOf(field);
					if (staged.clear) {
						if (this.stored(field)) plan.push([field, { kind: "clear" }]);
						continue;
					}
					if (staged.text === spec.format(this.sectionValue(field))) continue;
					const write = spec.parse(staged.text);
					plan.push(write === void 0 ? void 0 : [field, write]);
				}
				return plan;
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				this.publish();
			}
			specOf(field) {
				const spec = this.specs.get(field);
				if (spec === void 0) throw new Error(`settings card has no field ${field}`);
				return spec;
			}
			snapshot() {
				return this.scope.getSnapshot();
			}
			sectionValue(field) {
				return this.snapshot().value?.[field];
			}
			baseValue(field) {
				return this.snapshot().base?.[field];
			}
			userLayer() {
				return this.snapshot().user;
			}
			stored(field) {
				const user = this.userLayer();
				return user !== void 0 && Object.hasOwn(user, field);
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/AlbumSettingsCard.tsx
		/** Bridges the 'photo-album' scope onto the card's staged form. */
		var AlbumSettingsCardController = class {
			form;
			store;
			pickDirectory;
			browseError = null;
			constructor(scope, pickDirectory) {
				this.pickDirectory = pickDirectory;
				this.form = new CardForm(scope, [
					booleanField("enabled"),
					textField("title"),
					textField("photosDir"),
					booleanField("recursive"),
					numberField("columns", {
						integer: true,
						min: 1,
						max: 12
					})
				]);
				this.store = this.form.bind(() => this.projection());
			}
			projection() {
				return {
					...this.form.shell(),
					enabled: this.form.field("enabled"),
					title: this.form.field("title"),
					photosDir: this.form.field("photosDir"),
					recursive: this.form.field("recursive"),
					columns: this.form.field("columns"),
					browseError: this.browseError
				};
			}
			/** Open the host's native directory picker; a picked path fills the field. */
			async browse() {
				this.browseError = null;
				this.store.set(this.projection());
				try {
					const path = await this.pickDirectory();
					if (path !== null && path !== "") this.form.actions().edit("photosDir", path);
				} catch (error) {
					this.browseError = error instanceof Error ? error.message : String(error);
				}
				this.store.set(this.projection());
			}
			/** Build the face the card's slot registration injects. */
			inject() {
				return {
					hooks: { albumSettingsCard: this.store },
					...this.form.actions(),
					browseDirectory: () => {
						this.browse();
					}
				};
			}
			/** Release the card's scope subscription and bound stores. */
			dispose() {
				this.form.dispose();
			}
		};
		function FieldHead(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pa-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
					className: "dsh-pa-label",
					htmlFor: props.id,
					children: props.label
				}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh-pa-badges",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-pa-badge",
						children: props.t("settings.overridden")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dsh-pa-reset",
						disabled: props.disabled,
						onClick: props.onReset,
						children: props.t("settings.reset")
					})]
				}) : null]
			});
		}
		function TextField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pa-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldHead, {
						id: props.id,
						label: props.label,
						overridden: props.field.overridden,
						disabled: props.disabled,
						t: props.t,
						onReset: props.onReset
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-pa-input-row",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: props.id,
							className: props.field.invalid ? "dsh-pa-input-invalid" : "dsh-pa-input",
							type: "text",
							value: props.field.text,
							placeholder: props.placeholder ?? "",
							disabled: props.disabled,
							onChange: (event) => {
								props.onEdit(event.target.value);
							}
						}), props.action ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh-pa-browse",
							disabled: props.disabled,
							onClick: props.action.onClick,
							children: props.action.label
						}) : null]
					}),
					props.error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-invalid",
						children: props.error
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-hint",
						children: props.hint
					})
				]
			});
		}
		function BoolField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pa-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldHead, {
						id: props.id,
						label: props.label,
						overridden: props.field.overridden,
						disabled: props.disabled,
						t: props.t,
						onReset: props.onReset
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: props.id,
						className: "dsh-pa-select",
						value: props.field.text,
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: props.t("settings.inherit")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "true",
								children: props.t("settings.on")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "false",
								children: props.t("settings.off")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-pa-hint",
						children: props.hint
					})
				]
			});
		}
		function NumberField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-pa-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldHead, {
						id: props.id,
						label: props.label,
						overridden: props.field.overridden,
						disabled: props.disabled,
						t: props.t,
						onReset: props.onReset
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: props.field.invalid ? "dsh-pa-input-invalid" : "dsh-pa-input",
						type: "text",
						inputMode: "numeric",
						value: props.field.text,
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.field.invalid ? "dsh-pa-invalid" : "dsh-pa-hint",
						children: props.field.invalid ? props.t("settings.invalidNumber") : props.hint
					})
				]
			});
		}
		/**
		* Render the album settings card.
		* @param props - locale copy, the card snapshot, and its form actions.
		*/
		function AlbumSettingsCard(props) {
			const { t } = props;
			const state = props.useAlbumSettingsCard((snapshot) => snapshot);
			if (!state.available) return null;
			const fieldProps = {
				disabled: !state.writable,
				t
			};
			const blocked = !state.dirty || state.invalid || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dsh-pa-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-pa-header-static",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-pa-head-text",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-pa-name",
							children: t("settings.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-pa-description",
							children: t("settings.description")
						})]
					}), state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dsh-pa-pending",
						children: t("settings.unsaved")
					}) : null]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-pa-body",
					children: [
						!state.exposed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-pa-read-only",
							children: t("settings.notExposed")
						}) : null,
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-pa-read-only",
							children: t("settings.readOnly")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoolField, {
							id: "settings-album-enabled",
							label: t("settings.enabled"),
							hint: t("settings.enabledHint"),
							field: state.enabled,
							onEdit: (text) => {
								props.edit("enabled", text);
							},
							onReset: () => {
								props.resetField("enabled");
							},
							...fieldProps
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextField, {
							id: "settings-album-title",
							label: t("settings.titleField"),
							hint: t("settings.titleFieldHint"),
							field: state.title,
							onEdit: (text) => {
								props.edit("title", text);
							},
							onReset: () => {
								props.resetField("title");
							},
							...fieldProps
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextField, {
							id: "settings-album-photosDir",
							label: t("settings.photosDir"),
							hint: t("settings.photosDirHint"),
							field: state.photosDir,
							placeholder: "~/Pictures",
							onEdit: (text) => {
								props.edit("photosDir", text);
							},
							onReset: () => {
								props.resetField("photosDir");
							},
							action: {
								label: t("settings.browse"),
								onClick: () => {
									props.browseDirectory();
								}
							},
							error: state.browseError !== null ? t("settings.browseError", { error: state.browseError }) : null,
							...fieldProps
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoolField, {
							id: "settings-album-recursive",
							label: t("settings.recursive"),
							hint: t("settings.recursiveHint"),
							field: state.recursive,
							onEdit: (text) => {
								props.edit("recursive", text);
							},
							onReset: () => {
								props.resetField("recursive");
							},
							...fieldProps
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
							id: "settings-album-columns",
							label: t("settings.columns"),
							hint: t("settings.columnsHint"),
							field: state.columns,
							onEdit: (text) => {
								props.edit("columns", text);
							},
							onReset: () => {
								props.resetField("columns");
							},
							...fieldProps
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-pa-footer",
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-pa-failed",
									children: t("settings.saveFailed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-pa-discard",
									disabled: !state.dirty || state.saving,
									onClick: props.discard,
									children: t("settings.discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-pa-save",
									disabled: blocked,
									onClick: props.save,
									children: t(!state.saving ? "settings.save" : "settings.saving")
								})
							]
						})
					]
				})]
			});
		}
		/** Render the album settings card as a first-level settings page. */
		function AlbumSettingsSection(props) {
			const { t, useAlbumSettingsCard, save, discard, edit, resetField, browseDirectory } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: "dsh-pa-section-list",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlbumSettingsCard, {
					t,
					useAlbumSettingsCard,
					save,
					discard,
					edit,
					resetField,
					browseDirectory
				})
			});
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* Photo-album stylesheet, shipped as a string and injected once into a
		* `<style>` tag at apply time. Class names are prefixed `dsh-pa-` and the
		* center-column takeover rules are scoped by data attributes, so nothing leaks
		* into the rest of the GUI. Colors ride the dsh `--dsw-*` tokens so the album
		* follows the active theme.
		* @module dsh-photo-album/client/styles
		*/
		const ALBUM_CSS = `
/* --- center-column takeover (attribute-scoped) -------------------------------- */
[data-pane='conversation'],
[class*='centerCol'] {
  position: relative;
}
[data-dsh-photoalbum-view] {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 60;
  overflow: auto;
  background: var(--dsw-alias-bg-base);
}
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-photoalbum-view] {
  display: block;
}
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane='conversation'] > :not([data-dsh-photoalbum-view]),
html[data-dsh-photoalbum-active]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*='centerCol'] > :not([data-dsh-photoalbum-view]) {
  display: none !important;
}

/* --- sidebar entry row -------------------------------------------------------- */
.dsh-pa-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1;
}
.dsh-pa-entry:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-entry[data-active] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-entry-icon {
  display: inline-flex;
  align-items: center;
  flex: none;
}
.dsh-pa-entry-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --- gallery body ------------------------------------------------------------- */
.dsh-pa-album {
  min-height: 100%;
  padding: 20px 24px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.dsh-pa-album-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
}
.dsh-pa-album-header-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-pa-album-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}
.dsh-pa-album-subtitle {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}
.dsh-pa-album-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.dsh-pa-album-count {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-refresh,
.dsh-pa-album-close {
  appearance: none;
  font: inherit;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 15px;
  line-height: 1;
}
.dsh-pa-refresh:hover,
.dsh-pa-album-close:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-warning {
  margin: 0;
  color: var(--dsw-alias-state-warn-primary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-status {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}
.dsh-pa-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
}
.dsh-pa-samples-callout {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-pa-samples-text {
  flex: 1;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-choose {
  appearance: none;
  font: inherit;
  cursor: pointer;
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-choose:hover:not(:disabled) {
  opacity: 0.9;
}
.dsh-pa-choose:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-hint {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.dsh-pa-cell {
  position: relative;
  margin: 0;
  padding: 0 0 34px;
  border-radius: 10px;
}
.dsh-pa-cell[data-dsh-photoalbum-background-active] {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-pa-photo-button {
  appearance: none;
  font: inherit;
  cursor: pointer;
  width: 100%;
  border: 0;
  border-radius: 10px;
  padding: 0;
  background: transparent;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.dsh-pa-photo-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-pa-photo {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--dsw-alias-bg-layer-2);
  display: block;
}
.dsh-pa-photo-name {
  padding: 6px 4px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  text-align: left;
}
.dsh-pa-set-background,
.dsh-pa-background-reset,
.dsh-pa-lightbox-background {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-3);
  cursor: pointer;
  font: inherit;
}
.dsh-pa-set-background:disabled,
.dsh-pa-background-reset:disabled,
.dsh-pa-lightbox-background:disabled {
  cursor: default;
  opacity: 0.62;
}
.dsh-pa-set-background {
  position: absolute;
  right: 4px;
  bottom: 2px;
  left: 4px;
  min-height: 28px;
  border-radius: 8px;
  font-size: 11px;
}
.dsh-pa-background-reset {
  min-height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
}

/* --- lightbox ----------------------------------------------------------------- */
.dsh-pa-lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-stage {
  position: relative;
  max-width: calc(100vw - 120px);
  max-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 120px);
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}
.dsh-pa-lightbox-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #fff;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-lightbox-counter {
  white-space: nowrap;
  opacity: 0.7;
}
.dsh-pa-lightbox-nav,
.dsh-pa-lightbox-close {
  appearance: none;
  cursor: pointer;
  border: 0;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dsh-pa-lightbox-background {
  position: absolute;
  right: 24px;
  bottom: 20px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  color: #fff;
  background: rgba(20, 20, 24, 0.82);
  border-color: rgba(255, 255, 255, 0.2);
}
.dsh-pa-lightbox-nav:hover,
.dsh-pa-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.22);
}
.dsh-pa-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  font-size: 26px;
  line-height: 1;
}
.dsh-pa-lightbox-prev {
  left: 24px;
}
.dsh-pa-lightbox-next {
  right: 24px;
}
.dsh-pa-lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  font-size: 22px;
  line-height: 1;
}

/* --- settings card ------------------------------------------------------------- */
.dsh-pa-section-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.dsh-pa-card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
}
.dsh-pa-header-static {
  width: 100%;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.dsh-pa-head-text {
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
  display: flex;
}
.dsh-pa-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.dsh-pa-description {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-pending {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  flex: none;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dsh-pa-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding-bottom: 8px;
}
.dsh-pa-read-only {
  color: var(--dsw-alias-label-tertiary);
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-footer {
  border-top: 1px solid var(--dsw-alias-border-l2);
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 0 4px;
  display: flex;
}
.dsh-pa-failed {
  min-width: 0;
  color: var(--dsw-alias-label-error);
  flex: 1;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.dsh-pa-discard,
.dsh-pa-save {
  appearance: none;
  font: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 5px 14px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-discard {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  background: transparent;
}
.dsh-pa-discard:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-save {
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-layer-3);
}
.dsh-pa-discard:disabled,
.dsh-pa-save:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-field {
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  display: flex;
}
.dsh-pa-field + .dsh-pa-field {
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.dsh-pa-head {
  align-items: center;
  gap: 8px;
  display: flex;
}
.dsh-pa-label {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
.dsh-pa-badges {
  align-items: center;
  gap: 8px;
  display: inline-flex;
}
.dsh-pa-badge {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dsh-pa-reset {
  font: inherit;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-reset:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
}
.dsh-pa-input,
.dsh-pa-select {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-pa-input-row .dsh-pa-input,
.dsh-pa-input-row .dsh-pa-input-invalid {
  flex: 1;
  min-width: 0;
}
.dsh-pa-browse {
  appearance: none;
  font: inherit;
  cursor: pointer;
  flex: none;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-browse:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-pa-browse:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-pa-input:focus-visible,
.dsh-pa-select:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
  outline: none;
}
.dsh-pa-input-invalid {
  border: 1px solid var(--dsw-alias-label-error);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
}
.dsh-pa-invalid {
  color: var(--dsw-alias-label-error);
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-pa-hint {
  color: var(--dsw-alias-label-tertiary);
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
`;
		/** The `<style>` tag id used for idempotent injection. */
		const TAG_ID = "dsh-photo-album/styles";
		/**
		* Inject the album stylesheet once. Safe to call from any apply body; a
		* second call is a no-op for the page lifetime.
		*/
		function injectAlbumCss() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.pluginCss = TAG_ID;
			tag.textContent = ALBUM_CSS;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/index.ts
		/** Settings namespace the settings card edits (the Host plugin registers it). */
		const ALBUM_SETTINGS_NS = "photo-album";
		/** Required services (fiber inject waiting — the runtime must be up first). */
		const inject = [
			"slots",
			"locale",
			"connection",
			"settingsScope",
			"remote",
			"workspaces"
		];
		/**
		* Mount the photo album.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			injectAlbumCss();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "photo-album: dictionaries");
			const settingsScope = ctx.settingsScope.bind({ namespace: ALBUM_SETTINGS_NS });
			const settingsCard = new AlbumSettingsCardController(settingsScope, () => ctx.workspaces.pickDirectory());
			ctx.slots.inject("settings.section", () => {
				const unregister = ctx.slots.register({
					name: "settings.section",
					id: "photo-album",
					order: 140,
					label: () => ctx.locale.bind(NS)("settings.title"),
					locale: NS,
					inject: () => settingsCard.inject()
				}, AlbumSettingsSection);
				return () => {
					settingsCard.dispose();
					unregister();
				};
			});
			let uiDisposer;
			const mountUi = () => {
				if (uiDisposer !== void 0) return;
				const controller = new AlbumController();
				const disposers = [];
				try {
					disposers.push(mountSidebarEntry(controller));
					disposers.push(mountGallery(controller, {
						pickDirectory: () => ctx.workspaces.pickDirectory(),
						setPhotosDir: async (path) => {
							const result = await persistAlbumDirectory(path);
							if (!result.ok) throw new Error(result.error.message);
						},
						setBackgroundPhotoId: async (id) => {
							const result = await persistAlbumBackground(id === "" ? null : id);
							if (!result.ok) throw new Error(result.error.message);
						}
					}));
				} catch (error) {
					console.error("[dsh-photo-album] mount failed:", error);
				}
				uiDisposer = () => {
					for (const dispose of disposers.splice(0)) dispose();
					uiDisposer = void 0;
				};
			};
			const syncEnabled = () => {
				const snapshot = settingsScope.getSnapshot();
				if (snapshot.status === "ready" ? snapshot.value?.enabled ?? true : snapshot.status === "unavailable") mountUi();
				else uiDisposer?.();
			};
			settingsScope.subscribe(syncEnabled);
			syncEnabled();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
