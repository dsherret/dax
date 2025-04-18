use std::borrow::Cow;
use std::sync::Arc;
use std::sync::Mutex;

use console_static_text::ConsoleSize;
use console_static_text::ConsoleStaticText;
use console_static_text::TextItem;
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
      WasmTextItem::Text(text) => TextItem::Text(Cow::Borrowed(text.as_str())),
      WasmTextItem::HangingText { text, indent } => TextItem::HangingText {
        text: Cow::Borrowed(text.as_str()),
        indent: *indent,
      },
    }
  }
}

static STATIC_TEXT: std::sync::LazyLock<Arc<Mutex<ConsoleStaticText>>> =
  std::sync::LazyLock::new(|| {
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
  let items = items.iter().map(|t| t.as_text_item()).collect::<Vec<_>>();
  Ok(STATIC_TEXT.lock().unwrap().render_items_with_size(
    items.iter(),
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

#[wasm_bindgen]
pub fn static_text_render_once(
  items: JsValue,
  cols: usize,
  rows: usize,
) -> Result<Option<String>, JsValue> {
  let items: Vec<WasmTextItem> = serde_wasm_bindgen::from_value(items)?;
  let items = items.iter().map(|t| t.as_text_item()).collect::<Vec<_>>();
  let mut static_text = ConsoleStaticText::new(move || ConsoleSize {
    cols: Some(cols as u16),
    rows: Some(rows as u16),
  });
  Ok(static_text.render_items(items.iter()))
}

#[wasm_bindgen]
pub fn strip_ansi_codes(text: String) -> String {
  console_static_text::ansi::strip_ansi_codes(&text).to_string()
}
