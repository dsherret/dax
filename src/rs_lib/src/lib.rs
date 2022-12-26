use std::sync::Arc;
use std::sync::Mutex;

use console_static_text::ConsoleSize;
use console_static_text::ConsoleStaticText;
use console_static_text::TextItem;
use once_cell::sync::Lazy;
use serde::Deserialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse(command: String) -> Result<JsValue, JsValue> {
  console_error_panic_hook::set_once();

  match deno_task_shell::parser::parse(&command) {
    Ok(list) => Ok(serde_wasm_bindgen::to_value(&list).unwrap()),
    Err(err) => Err(serde_wasm_bindgen::to_value(&format!("{}", err)).unwrap()),
  }
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum WasmTextItem {
  Text(String),
  HangingText { text: String, indent: u16 },
}

impl WasmTextItem {
  pub fn as_text_item(&self) -> TextItem {
    match self {
      WasmTextItem::Text(text) => TextItem::Text(text.as_str()),
      WasmTextItem::HangingText { text, indent } => TextItem::HangingText {
        text: text.as_str(),
        indent: *indent,
      },
    }
  }
}

static STATIC_TEXT: Lazy<Arc<Mutex<ConsoleStaticText>>> = Lazy::new(|| {
  Arc::new(Mutex::new(ConsoleStaticText::new(|| ConsoleSize {
    cols: None,
    rows: None,
  })))
});

#[wasm_bindgen]
pub fn static_text_render_text(
  items: JsValue,
  cols: usize,
  rows: usize,
) -> Result<Option<String>, JsValue> {
  let items: Vec<WasmTextItem> = serde_wasm_bindgen::from_value(items)?;
  Ok(STATIC_TEXT.lock().unwrap().render_items_with_size(
    items.iter().map(|i| i.as_text_item()),
    ConsoleSize {
      cols: Some(cols as u16),
      rows: Some(rows as u16),
    },
  ))
}

#[wasm_bindgen]
pub fn static_text_clear_text(cols: usize, rows: usize) -> Option<String> {
  STATIC_TEXT
    .lock()
    .unwrap()
    .render_clear_with_size(ConsoleSize {
      cols: Some(cols as u16),
      rows: Some(rows as u16),
    })
}
