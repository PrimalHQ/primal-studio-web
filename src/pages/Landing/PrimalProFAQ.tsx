import { Component } from 'solid-js';

import styles from './Landing.module.scss';
import Dialog from 'src/components/Dialogs/Dialog';

import branding from 'src/assets/images/primal_studio_dark.svg';
import { useNavigate } from '@solidjs/router';

const PrimalProFAQ: Component<{
  id?: string,
  open: boolean,
  setOpen?: (v: boolean) => void,
}> = (props) => {
  const navigate = useNavigate();

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Primal Pro FAQ"
    >
      <div class={styles.primalProFAQ}>
        <article class={styles.faq}>
          <section>
            <h2>How do I get support?</h2>
            <p>Simply email us at <b>support@primal.net</b> and include your Primal Name in the message. Support requests from Premium and Pro users are prioritized and typically handled on the same business day.</p>
          </section>

          <section>
            <h2>Can I change my Primal Name?</h2>
            <p>Yes! If you wish to change your Primal Name, simply use the “Change your Primal Name” option in the Manage Premium section of any Primal app. Your new name will be functional immediately and your old name will be released and available to other users to register.</p>
          </section>

          <section>
            <h2>Do I have to use my Primal verified name and lightning address?</h2>
            <p>No. As a Primal Premium or Pro user you are able to reserve a Primal Name, but you are not required to use it as your nostr verified address (NIP-05), nor the bitcoin lightning address. Simply set any nostr verified address and/or the bitcoin lightning address you wish to use in your Nostr account profile settings.</p>
          </section>

          <section>
            <h2>I used to be in the Primal Legend tier. Do I get access to Primal Pro now?</h2>
            <p>Yes! All Primal Legend users as of June 20, 2025 have been upgraded to Primal Pro—no expiration, no extra cost. It’s our way of thanking you for being an early supporter.</p>
          </section>

          <section>
            <h2>Do I own my Primal Name indefinitely?</h2>
            <p>You have the right to use your Primal Name for the duration of your Primal subscription. After the subscription expires, there is a grace period of 30 days during which your Primal Name will not be available to others to register. Please note that all Primal Names are owned by Primal and rented to users. Primal reserves the right to revoke any name if we determine that the name is trademarked by somebody else, that there is a possible case of impersonation, or for any other case of abuse, as determined by Primal. Please refer to our <a href="https://primal.net/terms" target="_blank">Terms of Service</a> for details.</p>
          </section>

          <section>
            <h2>Can I buy multiple Primal Names?</h2>
            <p>We are working on adding the capability to manage multiple Primal Names. In the meantime, feel free to reach out to us via support@primal.net and we will try to accommodate. </p>
          </section>

          <section>
            <h2>Is my payment information associated with my Nostr account?</h2>
            <p>No. Primal Premium can be purchased via an iOS App Store in-app purchase, Google Play in-app purchase, or directly over bitcoin lightning via the Primal web app. Regardless of the method of payment, your payment information is not associated with your Nostr account.</p>
          </section>

          <section>
            <h2>Can I extend my subscription? How does that work? </h2>
            <p>Yes, you can extend your subscription using any of the payment methods we support: iOS App Store in-app purchase, Google Play in-app purchase, or directly over bitcoin lightning via the Primal web app. Any payment will extend your subscription by the number of months purchased. For example, if you purchase 3 Months of Primal Premium using the Primal web app, and then subscribe again via your mobile device, your subscription expiry date will be four months in the future, and it will continue to be pushed out with every subsequent monthly payment.</p>
          </section>

          <section>
            <h2>If I buy Primal Premium on my phone, will I have access to it on the web?</h2>
            <p>Yes. Your Primal Premium subscription is assigned to your Nostr account. Therefore, regardless of the way you choose to subscribe, your Primal Premium subscription will be available to you in all Primal apps: web, iOS, Android.</p>
          </section>

          <section>
            <h2>How does the Nostr contact list backup feature work?</h2>
            <p>Primal creates a backup of 100+ most recent versions of your Nostr follow list. If your follow list gets erased or corrupted by another Nostr app, you will be able to restore it using the Contact List Backup tool in the Nostr Tools section for Primal Premium users.</p>
          </section>

          <section>
            <h2>How does the Nostr account content backup feature work?</h2>
            <p>Primal archives the complete history of all your Nostr content. You can rebroadcast any subset of your content to your selected set of relays at any time using the Content Backup tool in the Nostr Tools section for Primal Premium users.</p>
          </section>

          <section>
            <h2>What other Premium features are coming in the future?</h2>
            <p>We are working on a ton of new and exciting features for Primal Premium. We will announce them as we get closer to releasing them. In the meantime, please feel free to reach out and let us know what you would like to see included in Primal Premium. All suggestions are welcome!</p>
          </section>

          <section>
            <h2>I’d like to support Primal. Can I do more?</h2>
            <p>At Primal, we don’t rely on advertising. We don’t monetize user data. We open source all our work to help the Nostr ecosystem flourish. If you wish to help us continue doing this work, you can purchase a Premium or Pro subscription, or simply leave a 5-star review in the app store. Thank you from the entire Primal Team! 🙏❤</p>
          </section>
        </article>
        <div class={styles.actions}>
          <button onClick={() => props.setOpen && props.setOpen(false)}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}

export default PrimalProFAQ;
