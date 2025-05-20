export default {
  title: 'Settings Page',
  header: 'Settings',
  sidebar: {
    relays: 'Relays',
    cachingService: 'Caching Service',
  },
  menu: {
    appearance: 'Appearance',
    uploads: 'Media Uploads',
    network: 'Network',
  },
  uploads: {
    mediaServer: 'Media Server',
  },
  network: {
    cachingService: 'Caching Service',
    connectedCachingService: 'Connected caching service',
    cahingPoolHelp: 'Client will randomly connect to one of the caching services in this pool. This helps with fail-over if some of the services are down. You can add or remove services. If you wish to always connect to exatly one caching service, you should leave only one entry in this pool.',
    alternativeCachingService: 'Connect to a different caching service',
    cachingServiceUrl: 'wss://cachingservice.url',
    invalidRelayUrl: 'Invalid url',
    restoreCachingService: 'Restore default caching service',
    relays: 'Relays',
    myRelays: 'My Relays',
    noMyRelays: 'Your Nostr account doesn\'t have any relays specified, so we connected you to a default set of relays. To configure your desired set of relays, please select them from the list below.',
    removeRelay: 'remove',
    removeRelayConfirm: (opts: { url: string }) => `Remove <b>${opts.url}</b> from your relay list? This will disconnect you from the relay.`,
    resetRelays: 'Reset Relays',
    resetRelaysHelp: 'This action will disconnect you from any relays you are currently connected to and connect you to a set of recomended relays.',
    customRelay: 'Connect to relay',
    relayUrl: 'wss://relay.url',
    proxyEvents: 'Use Enhanced Privacy',
    proxyDescription: 'When enabled, your IP address will be visible to the caching service, but not to relays. Your content will be published to your specified relays using the caching service as a proxy.',
  }
}
