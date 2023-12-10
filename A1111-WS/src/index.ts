import * as WebSocket from 'ws';
import axios from 'axios';
import mysql, { MysqlError } from 'mysql';
import 'dotenv/config';

// url of the Automatic1111 image generation load balancer instance
const apiUrl = process.env.APIURL ?? "http://localhost:3002"

console.log("API URL:", apiUrl);

function isValidSampler(samplers: Array<any>, sampler: string) {
  return samplers.some((s) => s.name === sampler)
}

const middleware = process.env.SERVER_NAME || 'WSS1'; // this name is used to identify the server in the logs because there are multiple servers running this service

console.log('Required environment variables:', {
  LOG_DB_HOST: process.env.LOG_DB_HOST,
  LOG_DB_PORT: process.env.LOG_DB_PORT,
  LOG_DB_USER: process.env.LOG_DB_USER,
  LOG_DB_PASSWORD: process.env.LOG_DB_PASSWORD,
  LOG_DB_NAME: process.env.LOG_DB_NAME,
  SERVER_NAME: process.env.SERVER_NAME,
  APIURL: process.env.APIURL
});

// create a connection to the MySQL database
const connection = mysql.createConnection({
  host: process.env.LOG_DB_HOST,
  port: parseInt(process.env.LOG_DB_PORT ?? '3306'),
  user: process.env.LOG_DB_USER,
  password: process.env.LOG_DB_PASSWORD,
  database: process.env.LOG_DB_NAME,
});

function connect() {
  // connect to the log database
  connection.connect((err: MysqlError) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
    } else {
      console.log('Connected to MySQL database');
    }
  });
}
connect();


async function start() {
  const wss = new WebSocket.Server({ port: 3001 });
  console.log('WebSocket server started on port 3001');
  
  try {
    // get all available samplers from the api so i can check if the sampler the user wants to use is valid
    const samplers = (await axios.get(`${apiUrl}/sdapi/v1/samplers`)).data;
    wss.on('connection', (ws: WebSocket) => {
      // limit the user to 1 image generation
      let cooldown = false;
      ws.on('message', async (data: WebSocket.RawData, isBinary: boolean) => {
        try {
          // parse the message from the user
          const messageString = isBinary ? data : data.toString();

          // make sure the message is a string
          if ( typeof messageString !== 'string' ) {
            ws.send(JSON.stringify({ status: 401 }))
            return;
          }

          // parse the message to json
          const message = JSON.parse(messageString);
          if (!cooldown || !message.sampler || !message.prompt || !message.refinerSwitch) {
            cooldown = true;
            // overwrite settings to make sure everything is set up correctly (This is just a precaution, it should be fine without it but just in case something was edited on the A1111 gradio page)
            await axios.post(`${apiUrl}/sdapi/v1/options`, {
              "samples_save": true,
              "samples_format": "png",
              "samples_filename_pattern": "",
              "save_images_add_number": true,
              "grid_save": true,
              "grid_format": "png",
              "grid_extended_filename": false,
              "grid_only_if_multiple": true,
              "grid_prevent_empty_spots": false,
              "grid_zip_filename_pattern": "",
              "n_rows": -1,
              "font": "",
              "grid_text_active_color": "#000000",
              "grid_text_inactive_color": "#999999",
              "grid_background_color": "#ffffff",
              "enable_pnginfo": true,
              "save_txt": false,
              "save_images_before_face_restoration": false,
              "save_images_before_highres_fix": false,
              "save_images_before_color_correction": false,
              "save_mask": false,
              "save_mask_composite": false,
              "jpeg_quality": 80,
              "webp_lossless": false,
              "export_for_4chan": true,
              "img_downscale_threshold": 4,
              "target_side_length": 4000,
              "img_max_size_mp": 200,
              "use_original_name_batch": true,
              "use_upscaler_name_as_suffix": false,
              "save_selected_only": true,
              "save_init_img": false,
              "temp_dir": "",
              "clean_temp_dir_at_start": false,
              "save_incomplete_images": false,
              "outdir_samples": "",
              "outdir_txt2img_samples": "outputs/txt2img-images",
              "outdir_img2img_samples": "outputs/img2img-images",
              "outdir_extras_samples": "outputs/extras-images",
              "outdir_grids": "",
              "outdir_txt2img_grids": "outputs/txt2img-grids",
              "outdir_img2img_grids": "outputs/img2img-grids",
              "outdir_save": "log/images",
              "outdir_init_images": "outputs/init-images",
              "save_to_dirs": true,
              "grid_save_to_dirs": true,
              "use_save_to_dirs_for_ui": false,
              "directories_filename_pattern": "[date]",
              "directories_max_prompt_words": 8,
              "ESRGAN_tile": 192,
              "ESRGAN_tile_overlap": 8,
              "realesrgan_enabled_models": [
                "R-ESRGAN 4x+",
                "R-ESRGAN 4x+ Anime6B"
              ],
              "upscaler_for_img2img": null,
              "face_restoration": false,
              "face_restoration_model": "CodeFormer",
              "code_former_weight": 0.5,
              "face_restoration_unload": false,
              "auto_launch_browser": "Local",
              "show_warnings": false,
              "show_gradio_deprecation_warnings": true,
              "memmon_poll_rate": 8,
              "samples_log_stdout": false,
              "multiple_tqdm": true,
              "print_hypernet_extra": false,
              "list_hidden_files": true,
              "disable_mmap_load_safetensors": false,
              "hide_ldm_prints": true,
              "api_enable_requests": true,
              "api_forbid_local_requests": true,
              "api_useragent": "",
              "unload_models_when_training": false,
              "pin_memory": false,
              "save_optimizer_state": false,
              "save_training_settings_to_txt": true,
              "dataset_filename_word_regex": "",
              "dataset_filename_join_string": " ",
              "training_image_repeats_per_epoch": 1,
              "training_write_csv_every": 500,
              "training_xattention_optimizations": false,
              "training_enable_tensorboard": false,
              "training_tensorboard_save_images": false,
              "training_tensorboard_flush_every": 120,
              "sd_model_checkpoint": "sd_xl_base_1.0.safetensors [31e35c80fc]",
              "sd_checkpoints_limit": 2,
              "sd_checkpoints_keep_in_cpu": false,
              "sd_checkpoint_cache": 0,
              "sd_unet": "Automatic",
              "enable_quantization": false,
              "enable_emphasis": true,
              "enable_batch_seeds": true,
              "comma_padding_backtrack": 20,
              "CLIP_stop_at_last_layers": 1,
              "upcast_attn": false,
              "randn_source": "GPU",
              "tiling": false,
              "hires_fix_refiner_pass": "second pass",
              "sdxl_crop_top": 0,
              "sdxl_crop_left": 0,
              "sdxl_refiner_low_aesthetic_score": 2.5,
              "sdxl_refiner_high_aesthetic_score": 6,
              "sd_vae_explanation": "<abbr title='Variational autoencoder'>VAE</abbr> is a neural network that transforms a standard <abbr title='red/green/blue'>RGB</abbr>\nimage into latent space representation and back. Latent space representation is what stable diffusion is working on during sampling\n(i.e. when the progress bar is between empty and full). For txt2img, VAE is used to create a resulting image after the sampling is finished.\nFor img2img, VAE is used to process user's input image before the sampling, and to create an image after sampling.",
              "sd_vae_checkpoint_cache": 0,
              "sd_vae": "Automatic",
              "sd_vae_overrides_per_model_preferences": true,
              "auto_vae_precision": true,
              "sd_vae_encode_method": "Full",
              "sd_vae_decode_method": "Full",
              "inpainting_mask_weight": 1,
              "initial_noise_multiplier": 1,
              "img2img_extra_noise": 0,
              "img2img_color_correction": false,
              "img2img_fix_steps": false,
              "img2img_background_color": "#ffffff",
              "img2img_editor_height": 720,
              "img2img_sketch_default_brush_color": "#ffffff",
              "img2img_inpaint_mask_brush_color": "#ffffff",
              "img2img_inpaint_sketch_default_brush_color": "#ffffff",
              "return_mask": false,
              "return_mask_composite": false,
              "cross_attention_optimization": "Automatic",
              "s_min_uncond": 0,
              "token_merging_ratio": 0,
              "token_merging_ratio_img2img": 0,
              "token_merging_ratio_hr": 0,
              "pad_cond_uncond": false,
              "persistent_cond_cache": true,
              "batch_cond_uncond": true,
              "use_old_emphasis_implementation": false,
              "use_old_karras_scheduler_sigmas": false,
              "no_dpmpp_sde_batch_determinism": false,
              "use_old_hires_fix_width_height": false,
              "dont_fix_second_order_samplers_schedule": false,
              "hires_fix_use_firstpass_conds": false,
              "use_old_scheduling": false,
              "interrogate_keep_models_in_memory": false,
              "interrogate_return_ranks": false,
              "interrogate_clip_num_beams": 1,
              "interrogate_clip_min_length": 24,
              "interrogate_clip_max_length": 48,
              "interrogate_clip_dict_limit": 1500,
              "interrogate_clip_skip_categories": [],
              "interrogate_deepbooru_score_threshold": 0.5,
              "deepbooru_sort_alpha": true,
              "deepbooru_use_spaces": true,
              "deepbooru_escape": true,
              "deepbooru_filter_tags": "",
              "extra_networks_show_hidden_directories": true,
              "extra_networks_hidden_models": "When searched",
              "extra_networks_default_multiplier": 1,
              "extra_networks_card_width": 0,
              "extra_networks_card_height": 0,
              "extra_networks_card_text_scale": 1,
              "extra_networks_card_show_desc": true,
              "extra_networks_add_text_separator": " ",
              "ui_extra_networks_tab_reorder": "",
              "textual_inversion_print_at_load": false,
              "textual_inversion_add_hashes_to_infotext": true,
              "sd_hypernetwork": "None",
              "localization": "None",
              "gradio_theme": "Default",
              "gradio_themes_cache": true,
              "gallery_height": "",
              "return_grid": true,
              "do_not_show_images": false,
              "send_seed": true,
              "send_size": true,
              "js_modal_lightbox": true,
              "js_modal_lightbox_initially_zoomed": true,
              "js_modal_lightbox_gamepad": false,
              "js_modal_lightbox_gamepad_repeat": 250,
              "show_progress_in_title": true,
              "samplers_in_dropdown": true,
              "dimensions_and_batch_together": true,
              "keyedit_precision_attention": 0.1,
              "keyedit_precision_extra": 0.05,
              "keyedit_delimiters": ".,\\/!?%^*;:{}=`~()",
              "keyedit_move": true,
              "quicksettings_list": [
                "sd_model_checkpoint"
              ],
              "ui_tab_order": [],
              "hidden_tabs": [],
              "ui_reorder_list": [],
              "hires_fix_show_sampler": false,
              "hires_fix_show_prompts": false,
              "disable_token_counters": false,
              "add_model_hash_to_info": true,
              "add_model_name_to_info": true,
              "add_user_name_to_info": false,
              "add_version_to_infotext": true,
              "disable_weights_auto_swap": true,
              "infotext_styles": "Apply if any",
              "show_progressbar": true,
              "live_previews_enable": true,
              "live_previews_image_format": "png",
              "show_progress_grid": true,
              "show_progress_every_n_steps": 10,
              "show_progress_type": "Approx NN",
              "live_preview_allow_lowvram_full": false,
              "live_preview_content": "Prompt",
              "live_preview_refresh_period": 1000,
              "live_preview_fast_interrupt": false,
              "hide_samplers": [],
              "eta_ddim": 0,
              "eta_ancestral": 1,
              "ddim_discretize": "uniform",
              "s_churn": 0,
              "s_tmin": 0,
              "s_tmax": 0,
              "s_noise": 1,
              "k_sched_type": "Automatic",
              "sigma_min": 0,
              "sigma_max": 0,
              "rho": 0,
              "eta_noise_seed_delta": 0,
              "always_discard_next_to_last_sigma": false,
              "sgm_noise_multiplier": false,
              "uni_pc_variant": "bh1",
              "uni_pc_skip_type": "time_uniform",
              "uni_pc_order": 3,
              "uni_pc_lower_order_final": true,
              "postprocessing_enable_in_main_ui": [],
              "postprocessing_operation_order": [],
              "upscaling_max_images_in_cache": 5,
              "disabled_extensions": [],
              "disable_all_extensions": "none",
              "restore_config_state_file": "",
              "sd_checkpoint_hash": "31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b",
              "sd_lora": "None",
              "lora_preferred_name": "Alias from file",
              "lora_add_hashes_to_infotext": true,
              "lora_show_all": false,
              "lora_hide_unknown_for_versions": [],
              "lora_in_memory_limit": 0,
              "lora_functional": false,
              "canvas_hotkey_zoom": "Alt",
              "canvas_hotkey_adjust": "Ctrl",
              "canvas_hotkey_move": "F",
              "canvas_hotkey_fullscreen": "S",
              "canvas_hotkey_reset": "R",
              "canvas_hotkey_overlap": "O",
              "canvas_show_tooltip": true,
              "canvas_auto_expand": true,
              "canvas_blur_prompt": false,
              "canvas_disabled_functions": [
                "Overlap"
              ],
              "extra_options_txt2img": [],
              "extra_options_img2img": [],
              "extra_options_cols": 1,
              "extra_options_accordion": false
            })

            // set refiner switch to 0.8 if it's not set
            const refSwitch = message.refinerSwitch ? parseFloat(message.refinerSwitch) < 1 && parseFloat(message.refinerSwitch) > 0 ? parseFloat(message.refinerSwitch) : 0.8 : 0.8;

            // set default prompt and negative prompt
            let prompt = message.prompt ?? "A futuristic city with neon lights, rainy streets, bright colors, detailed";
            let negative_prompt = message.negativePrompt ?? "easynegative, ugly, horns, lowres, text, error, missing fingers, extra digit, fewer digits, cropped, (worst quality, low quality:1.4), jpeg artifacts, signature, bad anatomy, extra legs, extra arms, extra fingers, poorly drawn hands, poorly drawn feet, disfigured, out of frame, tiling, bad art, deformed, mutated, blurry, fuzzy, misshaped, mutant, gross, disgusting, ugly, watermark, watermarks";

            // limit length of prompt and negative prompt to 400 characters
            prompt = message.prompt.length > 400 ? message.prompt.substring(0, 400) : message.prompt;
            negative_prompt = message.negativePrompt.length > 400 ? message.negativePrompt.substring(0, 400) : message.negativePrompt;

            const genImagesPostRequest = await axios.post(`${apiUrl}/sdapi/v1/txt2img`,
              {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "batch_size": 1,
                "steps": 20,
                "cfg_scale": 7,
                "sampler_name": isValidSampler(samplers, message.sampler) ? message.sampler : "DPM++ 2M Karras",
                "width": 1024,
                "height": 1024,
                "refiner_checkpoint": "sd_xl_refiner_1.0.safetensors",
                "refiner_switch_at": refSwitch
              })

            if (genImagesPostRequest.data) {
              cooldown = false;
              ws.send(JSON.stringify({ images: genImagesPostRequest.data.images, status: 200 }))
            } else {
              cooldown = false;
              ws.send(JSON.stringify({ status: 500 }))
            }
          } else {
            ws.send(JSON.stringify({ status: 401 }))
          }
        } catch (error) {
          ws.send(JSON.stringify({ status: 500 }))
          console.log(error);
        }
      });
    });
  } catch (error) {
    console.log(error);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const log = { timestamp, status: "500", server: middleware, middleware };

    // create log of error
    connection.query('INSERT INTO uptimelogs SET ?', log, (err, result) => {
      if (err) {
        console.error('Error logging request:', err);
      } else {
        console.log('Request logged:', log);
      }
    });

    //restart server if it crashes
    start();
  }
}

start();