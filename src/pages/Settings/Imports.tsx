import { Component, createSignal, For, onMount } from 'solid-js';
import styles from './Settings.module.scss';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';
import { createStore } from 'solid-js/store';
import { translate } from 'src/translations/translate';
import { settingsStore, updateSettingsStore } from 'src/stores/SettingsStore';
import { addToSettingsList, removeFromSettingsList } from 'src/primal_api/studio';
import { logError } from 'src/utils/logger';

const Imports: Component = () => {

  let noteUrlInput: HTMLInputElement | undefined;
  let articleUrlInput: HTMLInputElement | undefined;

  const onAddUrl = (
    target: HTMLInputElement | undefined,
    type: 'notes' | 'articles',
  ) => {
    if (!target || target.value === '') {
      return;
    }

    try {
      const value = target.value;

      target.value = '';

      if (settingsStore.importUrls[type].includes(value)) return;

      addToSettingsList('content_imports', value, type);

      updateSettingsStore('importUrls', type, settingsStore.importUrls[type].length, () => value);

    } catch (e) {
      logError('invalid url input ', e);
    }
  }

  const onRemoveUrl = async (url: string, type: 'notes' | 'articles') => {

    try {
      await removeFromSettingsList('content_imports', url, type);

      updateSettingsStore('importUrls', type, (urls) => urls.filter(u => u !== url));

    } catch (e) {
      logError('invalid pubkey input ', e);
    }

  }

  return (
    <div class={styles.importsPage}>

      <div class={`${styles.settingsSectionFull} ${styles.noBorder}`}>
        <div class={styles.settingsCaptionLight}>
          {translate('settings', 'imports', 'noteCaption')}
          <div class={styles.desc}>
          {translate('settings', 'imports', 'noteDescription')}
          </div>
        </div>

        <div class={styles.settingsRowPadded}>
          <div
            class={styles.settingsInput}
          >
            <input
              ref={noteUrlInput}
              type="text"
              placeholder={translate('settings', 'imports', 'addUrlPlaceholder')}
              onChange={() => onAddUrl(noteUrlInput, 'notes')}
            />
          </div>
          <ButtonPrimary onClick={() => onAddUrl(noteUrlInput, 'notes')}>
            Add
          </ButtonPrimary>
        </div>

        <div style="height: 20px"></div>

        <div class={styles.urlList}>
          <For each={settingsStore.importUrls.notes}>
            {url => (
              <div class={styles.urlItem}>
                <div class={styles.urlLabel}>{url}</div>
                <button class={styles.remove} onClick={() => onRemoveUrl(url, 'notes')}>
                  remove
                </button>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class={`${styles.settingsSectionFull} ${styles.noBorder}`}>
        <div class={styles.settingsCaptionLight}>
          {translate('settings', 'imports', 'articleCaption')}
          <div class={styles.desc}>
          {translate('settings', 'imports', 'articleDescription')}
          </div>
        </div>

        <div class={styles.settingsRowPadded}>
          <div
            class={styles.settingsInput}
          >
            <input
              ref={articleUrlInput}
              type="text"
              placeholder={translate('settings', 'imports', 'addUrlPlaceholder')}
              onChange={() => onAddUrl(articleUrlInput, 'articles')}
            />
          </div>
          <ButtonPrimary onClick={() => onAddUrl(articleUrlInput, 'articles')}>
            Add
          </ButtonPrimary>
        </div>

        <div style="height: 20px"></div>

        <div class={styles.urlList}>
          <For each={settingsStore.importUrls.articles}>
            {url => (
              <div class={styles.urlItem}>
                <div class={styles.urlLabel}>{url}</div>
                <button class={styles.remove} onClick={() => onRemoveUrl(url, 'articles')}>
                  remove
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export default Imports;
