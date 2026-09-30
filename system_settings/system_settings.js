/* i18n処理 */
const i18n_message = chrome.i18n.getMessage.bind(chrome.i18n);
//data-i18n属性を持つ要素に、現在の言語の文言を設定する
function applyI18n() {
  //ブラウザの言語をページの言語として設定する
  document.documentElement.lang = chrome.i18n.getUILanguage();

  for (const element of document.querySelectorAll("[data-i18n]")) {
    const messageKey = element.dataset.i18n;
    const message = i18n_message(messageKey);

    //キーが見つからない場合はHTML上の文言をそのまま使う
    if (message) {
      element.textContent = message;
    }
  }

  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    const messageKey = element.dataset.i18nPlaceholder;
    const message = i18n_message(messageKey);

    if (message) {
      element.placeholder = message;
    }
  }
}

/* CSSサニタイズ処理 */

//url()や文字列として許可するdataURL(画像とフォントのみ)
const ALLOWED_DATA_URL =
  /^data:\s*(?:image\/(?:png|jpeg|gif|webp|avif)|font\/(?:woff2?|ttf|otf))\s*[;,]/;

//CSSのエスケープ表記(\75や\(など)を元の文字に戻す
function decodeCssEscapes(cssText) {
  const escapePattern = /\\([0-9a-f]{1,6})\s?|\\([\s\S])/gi;

  return cssText.replace(
    escapePattern,
    (escapeSequence, hexCode, escapedCharacter) => {
      //\75のような16進数のエスケープは、文字コードから文字に戻す
      if (hexCode) {
        //Unicodeの最大値を超える文字コードは最大値に丸める
        const codePoint = Math.min(parseInt(hexCode, 16), 0x10ffff);
        return String.fromCodePoint(codePoint);
      }

      //それ以外のエスケープは、後ろの文字をそのまま使う
      return escapedCharacter;
    },
  );
}

//ルールに危険な記述(外部URLの読み込みなど)が含まれているか判定する
function isDangerous(cssText) {
  //エスケープ表記で危険な記述を隠せないよう、展開してから判定する
  const decodedText = decodeCssEscapes(cssText).toLowerCase();

  //url()の中身が許可されたdataURL以外なら危険
  const urlFunctionPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))/g;

  for (const match of decodedText.matchAll(urlFunctionPattern)) {
    //ダブルクォート・シングルクォート・クォート無しのいずれかの中身
    const urlValue = match[1] ?? match[2] ?? match[3];

    if (!ALLOWED_DATA_URL.test(urlValue)) {
      return true;
    }
  }

  //文字列でURLを受け取れる関数が無ければ安全とみなす(image-rectはFirefoxの-moz-image-rect)
  const urlStringFunctionPattern =
    /(?:src|image|image-set|image-rect|cross-fade)\(/;
  const hasUrlStringFunction = urlStringFunctionPattern.test(decodedText);

  if (!hasUrlStringFunction) {
    return false;
  }

  //var()で別ルールからURL文字列を差し込めるため、併用は危険とみなす
  const hasCssVariable = /var\(/.test(decodedText);

  if (hasCssVariable) {
    return true;
  }

  //文字列の中身が許可されたdataURL以外なら危険
  const stringPattern = /"([^"]*)"|'([^']*)'/g;

  for (const match of decodedText.matchAll(stringPattern)) {
    //ダブルクォート・シングルクォートのいずれかの中身
    const stringValue = match[1] ?? match[2];

    if (!ALLOWED_DATA_URL.test(stringValue)) {
      return true;
    }
  }

  return false;
}

//スタイルシート(または@mediaなどのグループルール)から危険なルールを削除する
function removeDangerousRules(container, removedRules) {
  //削除で添字がずれないよう後ろから走査する
  for (let index = container.cssRules.length - 1; index >= 0; index--) {
    const rule = container.cssRules[index];

    //@mediaなどの入れ子のルールは、中身を先に判定する
    //(@keyframesは中身だけ消せないため、丸ごと判定する)
    const hasChildRules = Boolean(rule.cssRules);
    const isKeyframesRule = rule instanceof CSSKeyframesRule;

    if (hasChildRules && !isKeyframesRule) {
      removeDangerousRules(rule, removedRules);
    }

    if (isDangerous(rule.cssText)) {
      removedRules.push(rule.cssText);
      container.deleteRule(index);
    }
  }
}

//カスタムCSSをサニタイズし、サニタイズ後のCSSと除去したルールの一覧を返す
function sanitizeCss(inputCss) {
  //ブラウザのCSSパーサーで解析する(@importはここで捨てられる)
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(inputCss);

  const removedRules = [];
  removeDangerousRules(styleSheet, removedRules);

  //残ったルールをCSSテキストに戻す
  const remainingRuleTexts = Array.from(
    styleSheet.cssRules,
    (rule) => rule.cssText,
  );

  //style要素の外に抜け出せないよう<をエスケープする
  const sanitizedCss = remainingRuleTexts.join("\n").replace(/</g, "\\3C ");

  //@importは解析時に捨てられて一覧に残らないため、元のCSSから拾う
  const removedImportRules = inputCss.match(/@import[^;]*;?/gi) ?? [];

  //後ろから集めたので記述順に戻す
  removedRules.reverse();

  return {
    css: sanitizedCss,
    removedRules: [...removedImportRules, ...removedRules],
  };
}

/* システム設定画面の処理 */

document.addEventListener("DOMContentLoaded", async () => {
  applyI18n();

  const customCssTwitterTextarea = document.getElementById(
    "opd_custom_css_twitter",
  );
  const customCssTwitterApplyButton = document.getElementById(
    "opd_custom_css_twitter_apply",
  );

  //保存済みの入力したままのCSSを入力欄に表示する
  const currentSettings = await OpdSystemSettingsManager.load();
  customCssTwitterTextarea.value = currentSettings.user_custom_css_twitter;

  //設定ボタンで入力したままのCSSとサニタイズ後のCSSを両方保存する
  customCssTwitterApplyButton.addEventListener("click", async () => {
    const inputCss = customCssTwitterTextarea.value;
    const { css, removedRules } = sanitizeCss(inputCss);

    await OpdSystemSettingsManager.set("user_custom_css_twitter", inputCss);
    await OpdSystemSettingsManager.set(
      "user_custom_css_twitter_sanitized",
      css,
    );

    const hasRemovedRules = removedRules.length > 0;

    if (hasRemovedRules) {
      const removedRulesText = removedRules.join("\n\n");
      alert(
        i18n_message("app_custom_css_applied_with_removed", [removedRulesText]),
      );
    } else {
      alert(i18n_message("app_custom_css_applied"));
    }
  });
});
