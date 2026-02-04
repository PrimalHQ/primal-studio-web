import QRCodeStyling from 'qr-code-styling';
import { Component, createEffect } from 'solid-js';

import qrNostrich from 'assets/icons/qr_nostrich.svg'
import qrLightning from 'assets/icons/qr_lightning.svg';

import styles from './QrCode.module.scss';


const QrCode: Component<{
  data: string,
  ecl?: 'L' | 'M' | 'Q' | 'H',
  image?: string,
  imageSize?: number,
  type?: string,
  width?: number,
  height?: number,
}> = (props) => {
  let qrSlot: HTMLDivElement | undefined;

  const qrTypes = ['nostr', 'lightning'];

  const qrType = () => {
    const t = props.type && qrTypes.includes(props.type) ?
      props.type :
      'none';

    const qrImages: Record<string, string | undefined> = {
      nostr: qrNostrich,
      lightning: qrLightning,
      none: undefined,
    }

    return qrImages[t];
  };

  createEffect(() => {
    const qrCode = new QRCodeStyling({
      width: props.width || 280,
      height: props.height || 280,
      type: "svg",
      data: props.data,
      margin: 0,
      image: qrType(),
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: props.ecl || "Q",
      },
      imageOptions: {
        hideBackgroundDots: false,
        imageSize:0.2,
        margin: 0,
      },
      dotsOptions:{
        type: "dots",
        color: 'black',
      },
      cornersSquareOptions: {
        type: 'extra-rounded' ,
        color: 'black',
      },
      cornersDotOptions: {
        type: 'dot',
        color: 'black',
      },
      backgroundOptions: {
        color: 'white',
      },
    });
    qrCode.append(qrSlot);
  });

  return (
    <div class={styles.container}>
      <div class={styles.frame}>
        <div id="qrSlot" ref={qrSlot}></div>
      </div>
    </div>
  );
}

export default QrCode;
