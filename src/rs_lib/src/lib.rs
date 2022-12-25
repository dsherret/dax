use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse(command: String) -> Result<JsValue, JsValue> {
  console_error_panic_hook::set_once();

  match deno_task_shell::parser::parse(&command) {
    Ok(list) => Ok(serde_wasm_bindgen::to_value(&list).unwrap()),
    Err(err) => Err(serde_wasm_bindgen::to_value(&format!("{}", err)).unwrap()),
  }
}
