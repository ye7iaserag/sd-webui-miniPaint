import json

import gradio as gr
import os
from pathlib import Path
import modules.scripts as scripts
from modules import script_callbacks
from modules import extensions
from typing import Callable
from modules.shared import opts
from modules import shared

def on_ui_tabs():

    extension_dir = os.path.split(Path(__file__).parent.parent.resolve())[-1]
    print(Path(__file__).parent.parent.resolve())
    print(extension_dir)

    with gr.Blocks(analytics_enabled=False) as minipaint_editor:

        gr.HTML(f"""<iframe style="width:100%; height:1000px;" id="miniPaint-iframe" src="/file=extensions/{extension_dir}/miniPaint/index.html" allow="camera"></iframe>""")

        with gr.Row():
            with gr.Accordion("img2img", open=True):
                send_i2i_i2i = gr.Button(value="Send to img2img")
                send_i2i_inpaint = gr.Button(value="Send to inpaint")
            with gr.Accordion("ControlNet", open=True):
                send_t2t_controlnet = gr.Button(value="Send to txt2img")
                send_i2i_controlnet = gr.Button(value="Send to img2img")

                try:
                    control_net_num = opts.control_net_max_models_num
                except:
                    control_net_num = 1

                select_target_index = gr.Dropdown([str(i) for i in range(control_net_num)],
                                                  label="Send to", value="0", interactive=True,
                                                  visible=(control_net_num > 1))

            send_t2t_controlnet.click(None, select_target_index, None, _js="(i) => {sendImageMiniPaintControlNet('txt2img', i)}")
            send_i2i_controlnet.click(None, select_target_index, None, _js="(i) => {sendImageMiniPaintControlNet('img2img', i)}")
            send_i2i_i2i.click(None, send_i2i_i2i, None, _js="() => sendImageMiniPaint('img2img_img2img')")
            send_i2i_inpaint.click(None, send_i2i_inpaint, None, _js="() => sendImageMiniPaint('img2img_inpaint')")

    return [(minipaint_editor, "miniPaint Editor", "minipaint_editor")]

script_callbacks.on_ui_tabs(on_ui_tabs)
