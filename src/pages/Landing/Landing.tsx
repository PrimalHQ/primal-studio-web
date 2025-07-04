import { Component, createEffect, createSignal, on, onMount, Show } from 'solid-js';

import styles from './Landing.module.scss';

import logo from 'src/assets/images/landing/logo.svg';
import analyticsImage from 'src/assets/images/landing/analytics_image.png';
import authoringImage from 'src/assets/images/landing/authoring_image.png';
import importImage from 'src/assets/images/landing/import_image.png';
import intorImage from 'src/assets/images/landing/main_visual_1.png';
import mediaImage from 'src/assets/images/landing/media_image.png';
import menuImage from 'src/assets/images/landing/menu.svg';
import schedulingImage from 'src/assets/images/landing/scheduling_image.png';
import teamImage from 'src/assets/images/landing/team_image.png';
import GetStartedDialog from './GetStartedDialog';
import SignInDialog from './SignInDialog';
import PrimalProFAQ from './PrimalProFAQ';

import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import { useBeforeLeave } from '@solidjs/router';
import { settingsStore } from 'src/stores/SettingsStore';
import PricingCardPro from './PricingCardPro';
import PricingCardTeam from './PricingCardTeam';
import BuyProDialog from './BuyProDialog';
import BuyTeamDialog from './BuyTeamDialog';
import { isPhone } from 'src/utils/ui';
import { accountStore } from 'src/stores/AccountStore';
import { globalNavigate } from 'src/App';

const Landing: Component = () => {
  const navigate = globalNavigate();

  const [showGetStarted, setShowGetStarted] = createSignal(false);
  const [showSignIn, setShowSignIn] = createSignal(false);
  const [showFAQ, setShowFAQ] = createSignal(false);
  const [showBuyPro, setShowBuyPro] = createSignal(false);
  const [showBuyTeam, setShowBuyTeam] = createSignal(false);


  createEffect(on(() => settingsStore.theme, () => {
    setTimeout(() => {
      const html: HTMLElement | null = document.querySelector('html');
      html?.setAttribute('data-theme', 'studio_dark');
    }, 10)
  }));

  useBeforeLeave(() => {
    const html: HTMLElement | null = document.querySelector('html');
    html?.setAttribute('data-theme', settingsStore.theme);
  })

  return (
    <div class={styles.landing}>
      <div class={styles.introSection}>
        <div class={styles.header}>
          <img class={styles.logo} src={logo} />
          <div class={styles.headerActions}>
            <button
              class={styles.signInButton}
              onClick={() => {
                if (accountStore.accountIsReady) {
                  navigate?.('/home');
                  return;
                }
                setShowSignIn(true);
              }}
            >
              Sign In
            </button>
            <button
              class={styles.getStartedButton}
              onClick={() => {
                if (accountStore.accountIsReady) {
                  navigate?.('/home');
                  return;
                }
                setShowGetStarted(true);
              }}
            >
              Get Started
            </button>

            <Show when={isPhone()}>
              <DropdownMenu gutter={30}>
                <DropdownMenu.Trigger class={styles.dropdownToggle}>
                  <img src={menuImage} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content class={styles.dropdownContent}>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#authoring_tools', '_self')}
                    >
                      Authoring Tools
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#media_managment', '_self')}
                    >
                      Media Managment
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#content_imports', '_self')}
                    >
                      Content Imports
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#smart_scheduling', '_self')}
                    >
                      Smart Scheduling
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#team_collaboration', '_self')}
                    >
                      Team Collaboration
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#content_analytics', '_self')}
                    >
                      Content Analytics
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      class={styles.dropdownItem}
                      onSelect={() => window.open('#pricing', '_self')}
                    >
                      Pricing
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu>
            </Show>
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

      <section class={styles.authoringSection} id="authoring_tools">
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

      <section class={styles.mediaSection} id="media_managment">
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

      <section class={styles.importSection} id="content_imports">
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

      <section class={styles.schedulingSection} id="smart_scheduling">
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

      <section class={styles.teamSection} id="team_collaboration">
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

      <section class={styles.analyticsSection} id="content_analytics">
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

      <section class={styles.pricingSection} id="pricing">
        <Show when={isPhone()}>
          <h3 class={styles.phonePricing}>
            Pricing
          </h3>
        </Show>

        <div class={styles.pricingCards}>
          <PricingCardPro onClick={() => setShowBuyPro(true)} />
          <PricingCardTeam onClick={() => setShowBuyTeam(true)} />
        </div>
        <div>
          <Show when={!isPhone()}>
            <h3>
              Pricing
            </h3>
          </Show>

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

      <BuyProDialog
        open={showBuyPro()}
        setOpen={setShowBuyPro}
      />

      <BuyTeamDialog
        open={showBuyTeam()}
        setOpen={setShowBuyTeam}
      />

    </div>
  );
}

export default Landing;
