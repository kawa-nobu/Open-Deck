//システム設定を保存・読み出しするクラス
class OpdSystemSettingsManager {
  //ストレージに保存する際のキー名
  static STORAGE_KEY = "opd_system_settings";

  //デフォルト設定(デスクトップアプリ版のopd_system_settingsと互換性がある)
  static DEFAULT_SETTINGS = {
    user_custom_css_twitter: "",
    user_custom_css_twitter_sanitized: "",
  };

  //設定を読み出し、デフォルト設定とキー構成が異なれば同期して保存する
  static async load() {
    const storageData = await chrome.storage.local.get(this.STORAGE_KEY);

    //保存データが無い場合(新規作成時)は空のオブジェクトとして扱う
    let storedSettings = storageData[this.STORAGE_KEY];
    if (storedSettings === undefined) {
      storedSettings = {};
    }

    //デフォルト設定のキーを基準に同期した設定を作る
    //(デフォルト設定に存在しないキーはここで除外される)
    const syncedSettings = {};

    for (const key of Object.keys(this.DEFAULT_SETTINGS)) {
      const hasStoredValue = key in storedSettings;

      if (hasStoredValue) {
        //保存済みの値があれば引き継ぐ
        syncedSettings[key] = storedSettings[key];
      } else {
        //新しく追加されたキーはデフォルト値を使う
        syncedSettings[key] = this.DEFAULT_SETTINGS[key];
      }
    }

    //新規作成・キーの追加・削除があった場合のみ保存する
    const isChanged =
      JSON.stringify(syncedSettings) !== JSON.stringify(storedSettings);

    if (isChanged) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: syncedSettings });
    }

    return syncedSettings;
  }

  //指定したキーに値を設定して保存する
  static async set(key, value) {
    //デフォルト設定に存在しないキーは保存しない
    const isValidKey = key in this.DEFAULT_SETTINGS;

    if (!isValidKey) {
      return;
    }

    //現在の設定を読み出し、指定したキーの値だけ書き換える
    const currentSettings = await this.load();
    currentSettings[key] = value;

    await chrome.storage.local.set({ [this.STORAGE_KEY]: currentSettings });
  }
}
