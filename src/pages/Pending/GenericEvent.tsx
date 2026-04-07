import { Component, Show, } from 'solid-js';

import styles from './GenericEvent.module.scss';

import deleteIcon from 'assets/icons/delete.svg?no-inline';
import downloadIcon from 'assets/icons/download.svg?no-inline';
import highlightIcon from 'assets/icons/highlight_create.svg?no-inline';
import likeIcon from 'assets/icons/like.svg?no-inline';
import listIcon from 'assets/icons/list.svg?no-inline';
import postIcon from 'assets/icons/post.svg?no-inline';
import profileIcon from 'assets/icons/profile.svg?no-inline';
import reportIcon from 'assets/icons/report.svg?no-inline';
import repostIcon from 'assets/icons/reposts.svg?no-inline';
import dmIcon from 'assets/icons/send_circle.svg?no-inline';
import settingsIcon from 'assets/icons/settings.svg?no-inline';
import uploadIcon from 'assets/icons/upload.svg?no-inline';
import genericIcon from 'assets/icons/messages.svg?no-inline';

import { Collapsible } from '@kobalte/core/collapsible';
import { NostrRelaySignedEvent } from 'src/primal';
import { Kind, settingsDescription } from 'src/constants';
import { accountStore } from 'src/stores/AccountStore';

const GenericEvent: Component<{
  event: NostrRelaySignedEvent,
  onResign: (event: NostrRelaySignedEvent) => void,
}> = (props) => {

  const eventIcon = () => {
    const kind = props.event.kind;

    switch (kind) {
      case Kind.EncryptedDirectMessage:
        return dmIcon;
      case Kind.Highlight:
        return highlightIcon;
      case Kind.ReportContent:
        return reportIcon;
      case Kind.Reaction:
        return likeIcon;
      case Kind.Repost:
        return repostIcon;
      case Kind.Blossom:
        return uploadIcon;
      case Kind.Text:
        return postIcon;
      case Kind.LongForm:
        return postIcon;
      case Kind.EventDeletion:
        return deleteIcon;
      case Kind.Contacts:
        return listIcon;
      case Kind.MuteList:
        return listIcon;
      case Kind.StreamMuteList:
        return listIcon;
      case Kind.Metadata:
        return profileIcon;
      case Kind.RelayList:
        return listIcon;
      case Kind.LiveChatMessage:
        return dmIcon;
      case Kind.Settings:
        return settingsIcon;
      case Kind.Draft:
        return downloadIcon;
      default:
        return genericIcon;
    }
  };

  const description = () => {

    const kind = props.event.kind;

    switch (kind) {
      case Kind.EncryptedDirectMessage:
        return 'Send Direct Message';
      case Kind.Highlight:
        return 'Highlight';
      case Kind.ReportContent:
        return 'Report Content';
      case Kind.Reaction:
        return 'Reaction';
      case Kind.Repost:
        return 'Repost';
      case Kind.Blossom:
        return 'Upload Content';
      case Kind.Text:
        return 'Note';
      case Kind.LongForm:
        return 'Article';
      case Kind.EventDeletion:
        return 'Delete Request';
      case Kind.Contacts:
        return 'Update Contacts List';
      case Kind.MuteList:
        return 'Update Mute List';
      case Kind.StreamMuteList:
        return 'Update Stream Mute List';
      case Kind.Metadata:
        return 'Update Profile';
      case Kind.RelayList:
        return 'Update Relay List';
      case Kind.LiveChatMessage:
        return 'Send Live Stream Message';
      case Kind.Settings:
        return resolveSettingsEvent(props.event);
      case Kind.Draft:
        return `Save Draft`;
      default:
        return 'Unknown Event';
    }
  }

  const resolveSettingsEvent = (ev: NostrRelaySignedEvent) => {
    const d = (ev.tags.find(t => t[0] === 'd') || ['d', '', ''])[2];

    switch (d) {
      case settingsDescription.getMembershipStatus:
        return 'Get Membership Status';
      case settingsDescription.changePremiumName:
        return 'Change Premium Name';
      case settingsDescription.getPremiumQRCode:
        return 'Get Premium QR Code';
      case settingsDescription.getLegendQRCode:
        return 'Get Legend QR Code';
      case settingsDescription.getPremiumStatus:
        return 'Get Premium Status';
      case settingsDescription.getPremiumMediaStats:
        return 'Get Premium Media Stats';
      case settingsDescription.getPremiumMediaList:
        return 'Get Premium Media List';
      case settingsDescription.deletePremiumMedia:
        return 'Delete Premium Media';
      case settingsDescription.getContactListHistory:
        return 'Get Contact List History';
      case settingsDescription.getContentListHistory:
        return 'Get Content List';
      case settingsDescription.getContentDownloadData:
        return 'Content Backup';
      case settingsDescription.startContentBroadcast:
        return 'Start Content Broadcast';
      case settingsDescription.cancelContentBroadcast:
        return 'Cancel Content Broadcast';
      case settingsDescription.startListeningForContentBroadcastStaus:
        return 'Listen for Content Broadcast';
      case settingsDescription.getOrderListHistory:
        return 'Get Purchase History';
      case settingsDescription.setLegendCustumization:
        return 'Update Legend Look';
      case settingsDescription.initStripe:
        return 'Initialize Stripe';
      case settingsDescription.resolveStripe:
        return 'Resolve Stripe';

      case settingsDescription.reportUser:
        return 'Report User';

      case settingsDescription.sendSettings:
        return 'Send Settings';
      case settingsDescription.getSettings:
        return 'Get Settings';
      case settingsDescription.setHomeSettings:
        return 'Send Home Settings';
      case settingsDescription.getHomeSettings:
        return 'Get Home Settings';
      case settingsDescription.setReadsSettings:
        return 'Send Reads Settings';
      case settingsDescription.getReadsSettings:
        return 'Get Reads Settings';
      case settingsDescription.setNWCSettings:
        return 'Send NWC Settings';
      case settingsDescription.getNWCSettings:
        return 'Get NWC Settings';

      case settingsDescription.nofiticationsLastSeen:
        return 'Update Notifications Last Seen';
      case settingsDescription.markAllAsRead:
        return 'Mark All DMs as Read';
      case settingsDescription.resetDirectMessages:
        return 'Reset Unread DM Count';

      case settingsDescription.getHomeTotals:
        return 'Get Home Totals';
      case settingsDescription.getHomeGraph:
        return 'Get Home Graph';
      case settingsDescription.getTopEvents:
        return 'Get Top Events';
      case settingsDescription.getFeedEvents:
        return 'Get Feed Events';
      case settingsDescription.getFeedTotals:
        return 'Get Feed Totals';
      case settingsDescription.getSettingsList:
        return 'Get Settings List';
      case settingsDescription.addToSettingsList:
        return 'Add to Settings List';
      case settingsDescription.removeFromSettingsList:
        return 'Remove From Settings List';
      case settingsDescription.importScheduled:
        return 'Import Scheduled';
      case settingsDescription.replaceScheduled:
        return 'Replace Scheduled';
      case settingsDescription.deleteFromInbox:
        return 'Delete From Inbox';
      case settingsDescription.getScheduledEvents:
        return 'Get Scheduled Events';
      case settingsDescription.deleteScheduled:
        return 'Delete Scheduled';
      case settingsDescription.getStatWeights:
        return 'Get Stat Weights';
      case settingsDescription.getMediaUses:
        return 'Get Media Uses';
      case settingsDescription.getLicenceStatus:
        return 'Get License Status';


      default:
        return 'Sync Settings';
    }
  }

  return (
    <Collapsible
      class={styles.genericEvent}
      data-event={props.event.id}
      data-event-kind={props.event.kind}
    >
      <Collapsible.Trigger class={styles.label}>
        <div class={styles.eventIcon}>
          <div
            style={`--mask-url: url(${eventIcon()});`}
          />
        </div>
        <div class={styles.eventDescription}>
          {description()}
          <span>
            {accountStore.sendErrors[props.event.id]}
          </span>
        </div>
        <Show when={!props.event.sig}>
          <button
            class={styles.resignButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onResign(props.event);
            }}
          >
            Retry Signing
          </button>
        </Show>
      </Collapsible.Trigger>
      <Collapsible.Content class={styles.details}>
        <pre>{JSON.stringify(props.event || '{}', null, 2)}</pre>
      </Collapsible.Content>
    </Collapsible>
  )
}

export default GenericEvent;
