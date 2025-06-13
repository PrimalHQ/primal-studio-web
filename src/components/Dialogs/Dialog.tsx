import { Component, JSXElement } from 'solid-js';

import styles from './Dialog.module.scss';
import { Dialog as KobalteDialog } from '@kobalte/core/dialog';


const Dialog: Component<{
  triggerClass: string,
  triggerContent?: JSXElement,
  title: JSXElement,
  children?: JSXElement,
  open?: boolean,
  setOpen?: (v: boolean) => void,
  id?: string,
}> = (props) => {

  return (
    <KobalteDialog
      open={props.open}
      onOpenChange={props.setOpen}
      modal={false}
    >
      <KobalteDialog.Trigger class={props.triggerClass}>
        {props.triggerContent}
      </KobalteDialog.Trigger>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class={styles.dialogOverlay} />
        <div class={styles.dialog}>
          <KobalteDialog.Content class={styles.dialogContent} >
            <div class={styles.dialogHeader}>
              <KobalteDialog.Title class={styles.dialogTitle}>
                {props.title}
              </KobalteDialog.Title>
              <KobalteDialog.CloseButton class={styles.dialogCloseButton}>
                <div class={styles.excludeIcon}></div>
              </KobalteDialog.CloseButton>
            </div>
            <KobalteDialog.Description class={styles.dialogDescription}>
              {props.children}
            </KobalteDialog.Description>
          </KobalteDialog.Content>
        </div>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}

export default Dialog;
