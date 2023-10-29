(function () {
    onUiLoaded(function () {

        function convertImageToBase64(imgUrl, callback) {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = image.naturalHeight;
                canvas.width = image.naturalWidth;
                ctx.drawImage(image, 0, 0);
                const dataUrl = canvas.toDataURL();
                callback && callback(dataUrl);
            }
            image.src = imgUrl;
        }

        function loadImage(src) {
            return new Promise((resolve, reject) => {
                let img = new Image()
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = src
            })
        }

        function getCombinedMiniPaintFrames() {
            const miniPaint = document.querySelector("#miniPaint-iframe").contentWindow;

            const canvas = document.createElement('canvas');
            canvas.height = miniPaint.AppConfig.HEIGHT;
            canvas.width = miniPaint.AppConfig.WIDTH;
            const ctx = canvas.getContext('2d');

            miniPaint.FileSave.disable_canvas_smooth(ctx);

            miniPaint.FileSave.Base_layers.convert_layers_to_canvas(ctx, null, false);

            const dataUrl = canvas.toDataURL();

            return dataUrl;
        }

        function dataURLtoFile(dataurl, filename) {
            var arr = dataurl.split(','),
                mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]),
                n = bstr.length,
                u8arr = new Uint8Array(n);

            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            return new File([u8arr], filename, { type: mime });
        }

        window.sendImageMiniPaint = function (type) {
            const imageDataURL = getCombinedMiniPaintFrames();
            var file = dataURLtoFile(imageDataURL, 'my-image-file.jpg');
            const dt = new DataTransfer();
            dt.items.add(file);

            const selector = type === "img2img_img2img" ? "#img2img_image" : "#img2maskimg";

            if (type === "img2img_img2img") {
                switch_to_img2img();
            } else if (type === "img2img_inpaint") {
                switch_to_inpaint();
            }

            let container = gradioApp().querySelector(selector);

            const imageElems = container.querySelectorAll('div[data-testid="image"]')

            updateGradioImage(imageElems[0], dt);
        }

        window.getMiniPaintTabIndex = function () {
            const tabMiniPaintDiv = document.getElementById('tab_minipaint_editor');
            const parent = tabMiniPaintDiv.parentNode;
            const siblings = parent.childNodes;

            let index = -1;
            for (let i = 0; i < siblings.length; i++) {
                if (siblings[i] === tabMiniPaintDiv) {
                    index = i;
                    break;
                }
            }

            return index / 3;
        }

        window.sendImageToMiniPaintEditorDirect = function (img, width, height) {
            const tabIndex = getMiniPaintTabIndex();
            gradioApp().querySelector('#tabs').querySelectorAll('button')[tabIndex - 1].click();

            var miniPaint = document.querySelector("#miniPaint-iframe").contentWindow;
            convertImageToBase64(img.src, miniPaint.FileOpen.file_open_data_url_handler);
        }

        window.sendImageToMiniPaintEditor = function (gallery) {
            const img = gallery.querySelector(".preview img");

            if (img) {
                const width = img.naturalWidth;
                const height = img.naturalHeight;

                sendImageToMiniPaintEditorDirect(img, width, height);
            } else {
                alert("No image selected");
            }
        }

        window.sendImageMiniPaintControlNet = async function (type, index) {
            const imageDataURL = getCombinedMiniPaintFrames();

            var file = dataURLtoFile(imageDataURL, 'my-image-file.jpg');

            const dt = new DataTransfer();
            dt.items.add(file);

            const selector = type === "txt2img" ? "#txt2img_script_container" : "#img2img_script_container";

            if (type === "txt2img") {
                switch_to_txt2img();
            } else if (type === "img2img") {
                switch_to_img2img();
            }

            const isNew = window.gradio_config.version.replace("\n", "") >= "3.23.0"
            const accordion_selector = isNew ? "#controlnet > .label-wrap > .icon" : "#controlnet .transition"
            const accordion = gradioApp().querySelector(selector).querySelector(accordion_selector)
            if (isNew ? accordion.style.transform == "rotate(90deg)" : accordion.classList.contains("rotate-90")) {
                accordion.click()
            }

            if (type === "img2img") {
                const checkboxSelector = "#img2img_controlnet_ControlNet-" + index + "_controlnet_same_img2img_checkbox input[type=checkbox]";
                await waitForElm(checkboxSelector);

                const checkbox = document.querySelector(checkboxSelector);
                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                }
            }

            let container = gradioApp().querySelector(selector);

            let element = container.querySelector('#controlnet');

            if (!element) {
                for (const spans of container.querySelectorAll < HTMLSpanElement > ('.cursor-pointer > span')) {
                    if (!spans.textContent?.includes('ControlNet') || spans.textContent?.includes('M2M')) {
                        continue;
                    }
                    element = spans.parentElement?.parentElement;
                }
                if (!element) {
                    console.error('ControlNet element not found');
                    return;
                }
            }

            const imageSelector = type === "txt2img" ? "#txt2img_controlnet_ControlNet-" + index + "_input_image" : "#img2img_controlnet_ControlNet-" + index + "_input_image";

            const imageElems = element.querySelectorAll(imageSelector + ' div[data-testid="image"]')

            const visibilitySelector = selector + (type === "txt2img" ? " #txt2img" : " #img2img") + "_controlnet_tabs .tabitem > div > .gr-group.gradio-group:not(.hide):not(.cnet-input-image-group):has(" + imageSelector + ")";

            if (!imageElems[Number(index)]) {
                await waitForElm(selector + " #controlnet " + imageSelector + " div[data-testid=image] input[type=file]");
                await waitForElm(visibilitySelector);
                const imageElems2 = element.querySelectorAll(imageSelector + ' div[data-testid="image"]');
                updateGradioImage(imageElems2[Number(index)], dt);
            } else {
                await waitForElm(visibilitySelector);
                updateGradioImage(imageElems[Number(index)], dt);
            }

        };

        function waitForElm(selector) {
            return new Promise(resolve => {
                if (document.querySelector(selector)) {
                    return resolve(document.querySelector(selector));
                }

                const observer = new MutationObserver(mutations => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }

        function updateGradioImage(element, dt) {
            let clearButton = element.querySelector("button[aria-label='Clear']");

            if (clearButton) {
                clearButton.click();
            }

            const input = element.querySelector("input[type='file']");
            input.value = '';
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
        }

        createSendToMiniPaintEditorButton("image_buttons_txt2img", window.txt2img_gallery);
        createSendToMiniPaintEditorButton("image_buttons_img2img", window.img2img_gallery);
        createSendToMiniPaintEditorButton("image_buttons_extras", window.extras_gallery);

        function createSendToMiniPaintEditorButton(queryId, gallery) {
            const existingButton = gradioApp().querySelector(`#${queryId} button`);
            const newButton = existingButton.cloneNode(true);
            newButton.style.display = "flex";
            newButton.id = `${queryId}_send_to_MiniPaint`;
            newButton.textContent = "Send to miniPaint";
            newButton.addEventListener("click", () => sendImageToMiniPaintEditor(gallery));
            gradioApp().querySelector(`#${queryId}`).appendChild(newButton);
        }
    });

})();