use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse(command: String) -> Result<JsValue, JsValue> {
  console_error_panic_hook::set_once();

  match deno_task_shell::parser::parse(&command) {
    Ok(list) => Ok(JsValue::from_serde(&list).unwrap()),
    Err(err) => Err(JsValue::from_serde(&format!("{}", err)).unwrap()),
  }
}
