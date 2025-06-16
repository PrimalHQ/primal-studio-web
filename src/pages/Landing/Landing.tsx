import { Component, createSignal, Show } from 'solid-js';

import styles from './Landing.module.scss';

import logo from 'src/assets/images/landing/logo.svg';
import analyticsImage from 'src/assets/images/landing/analytics_image.png';
import authoringImage from 'src/assets/images/landing/authoring_image.png';
import importImage from 'src/assets/images/landing/import_image.png';
import intorImage from 'src/assets/images/landing/main_visual_1.png';
import mediaImage from 'src/assets/images/landing/media_image.png';
import menuImage from 'src/assets/images/landing/menu.svg';
import pricingImage from 'src/assets/images/landing/pricing_image.png';
import pricingImagePhone from 'src/assets/images/landing/pricing_image_phone.png';
import schedulingImage from 'src/assets/images/landing/scheduling_image.png';
import teamImage from 'src/assets/images/landing/team_image.png';
import GetStartedDialog from './GetStartedDialog';
import SignInDialog from './SignInDialog';
import PrimalProFAQ from './PrimalProFAQ';

import { isIPhone, isAndroid } from '@kobalte/utils';

const Landing: Component = () => {

  const [showGetStarted, setShowGetStarted] = createSignal(false);
  const [showSignIn, setShowSignIn] = createSignal(false);
  const [showFAQ, setShowFAQ] = createSignal(false);

  const isPhone = () => {
    return isIPhone() || isAndroid() || /(iPad|iPhone|iPod)/.test(navigator.userAgent);
  };

  return (
    <div class={styles.landing}>

      <div class={styles.introSection}>
        <div class={styles.header}>
          <img class={styles.logo} src={logo} />
          <div class={styles.headerActions}>
            <button
              class={styles.signInButton}
              onClick={() => setShowSignIn(true)}
            >
              Sign In
            </button>
            <button
              class={styles.getStartedButton}
              onClick={() => setShowGetStarted(true)}
            >
              Get Started
            </button>

            <div class={styles.dropdown}>
              <input type="checkbox" id="dropdownToggle" class={styles.dropdownCheckbox} />
              <label for="dropdownToggle" class={styles.dropdownToggle}>
                <img src={menuImage} />
              </label>
              <div class={styles.dropdownContent}>
                <button
                  onClick={() => setShowSignIn(true)}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowGetStarted(true)}
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>

        <img class={styles.introMainImage} src={intorImage} />

        <div class={styles.introCopy}>
          <div class={styles.introCaption}>
            Introducing Primal Studio
          </div>

          <div class={styles.introDescription}>
            A professional publishing suite for Nostr, empowering content creators, teams and companies.
          </div>
        </div>

        <div class={styles.getStartedButtonPhone}>
          <button
            onClick={() => setShowGetStarted(true)}
          >
            Get Started
          </button>
        </div>
      </div>

      <section class={styles.authoringSection}>
        <img src={authoringImage} />
        <div>
          <h3>
            Authoring Tools
          </h3>
          <div class={styles.description}>
            Create Nostr content using our professional-grade editors. Enjoy rich formatting, full control through a dedicated code view, and real-time previews for both desktop and mobile layouts.
          </div>
        </div>
      </section>

      <section class={styles.mediaSection}>
        <img src={mediaImage} />
        <div>
          <h3>
            Media Management
          </h3>
          <div class={styles.description}>
            Organize and manage all your Nostr media uploads in one place. Get 100GB of media storage on Primal’s Blossom media server. Optionally mirror your content and manage any number of 3rd party Blossom servers.
          </div>
        </div>
      </section>

      <section class={styles.importSection}>
        <img src={importImage} />
        <div>
          <h3>
            Content Imports
          </h3>
          <div class={styles.description}>
            Seamlessly bring in your work from Substack, WordPress, Medium, Ghost, or any RSS-enabled platform. Imported content lands straight in your Primal Studio inbox—ready to publish or refine.
          </div>
        </div>
      </section>

      <section class={styles.schedulingSection}>
        <img src={schedulingImage} />
        <div>
          <h3>
            Smart Scheduling
          </h3>
          <div class={styles.description}>
            Plan your publishing cadence and reach your audience at the perfect moment. With Primal Studio, you can create, sign, and schedule your content in advance—our system handles the rest.
          </div>
        </div>
      </section>

      <section class={styles.teamSection}>
        <img src={teamImage} />
        <div>
          <h3>
            Team Collaboration
          </h3>
          <div class={styles.description}>
            Work efficiently with your team by enabling content creators to propose drafts, while designated users review, sign, and publish. This gives organizations of any size a secure and manageable presence on Nostr.
          </div>
        </div>
      </section>

      <section class={styles.analyticsSection}>
        <img src={analyticsImage} />
        <div>
          <h3>
            Content Analytics
          </h3>
          <div class={styles.description}>
            Understand how your content resonates across Nostr. Primal indexes the full network to deliver engagement scores, sentiment analysis, and sats zapped for every note and div you publish.
          </div>
        </div>
      </section>

      <section class={styles.pricingSection}>
        <Show
          when={isPhone()}
          fallback={<img src={pricingImage} />}
        >
          <img src={pricingImagePhone}/>
        </Show>
        <div>
          <h3>
            Pricing
          </h3>

          <div class={styles.description}>
            <p>
              Primal Studio is included in our Pro and Team tiers. All Pro and Team users also get Legend status on Primal—unlocking our highest level of features, visibility, and recognition across the network.
            </p>

            <p>
              Have a question? <button onClick={() => setShowFAQ(true)}>Check our FAQ</button>.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div class={styles.copyright}>
          Copyright © 2025 Primal
        </div>
        <div class={styles.links}>
          <a href="https://primal.net/terms" target="_blank">Terms of Service</a>
          <a href="https://primal.net/privacy" target="_blank">Privacy Policy</a>
        </div>
      </footer>

      <GetStartedDialog
        open={showGetStarted()}
        setOpen={setShowGetStarted}
      />

      <SignInDialog
        open={showSignIn()}
        setOpen={setShowSignIn}
      />

      <PrimalProFAQ
        open={showFAQ()}
        setOpen={setShowFAQ}
      />

    </div>
  );
}

export default Landing;
