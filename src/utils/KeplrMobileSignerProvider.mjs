import SignerProvider from "./SignerProvider.mjs"

export default class KeplrMobileSignerProvider extends SignerProvider {
  constructor(){
  }

  async enable(network){
    this.wallet = new (await import('@walletconnect/client')).default({
      bridge: 'https://bridge.walletconnect.org',
      signingMethods: [
        'keplr_enable_wallet_connect_v1',
        'keplr_sign_amino_wallet_connect_v1',
      ],
      qrcodeModal: {
        open: (walletConnectQrUri, closeCallback) => {
          // setOnQrCloseCallback(closeCallback)
          // updateState({
          //   status: CosmosWalletStatus.PendingWalletConnect,
          //   walletConnectQrUri,
          // })
        },
        // Occurs on disconnect, which is handled elsewhere.
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        close: () => {},
      },
      // clientMeta,
    })
    this.wallet._clientMeta = config.walletConnectClientMeta
    // Detect disconnected WalletConnect session and clear wallet state.
    this.wallet.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log('WalletConnect disconnected.')
      // disconnect(true)
      // cleanupAfterConnection()
    })
    console.log(this.wallet)

    if (this.wallet.connected) {
      // WalletConnect already connected, nothing to do.
      await this.finalizeWalletConnection(false)
    } else {
      // Prevent double requests by checking which connection attempt
      // we're on before and after starting the connection attempt.
      const currConnectionAttempt = nextWalletConnectConnectionAttempt()

      // Executes walletConnect's qrcodeModal.open.
      await this.wallet.connect()

      // If another connection attempt is being made, don't try to
      // enable if connect finishes. This prevents double requests.
      if (walletConnectConnectionAttempt !== currConnectionAttempt) {
        return
      }

      // Connect with new WalletConnect session.
      await this.finalizeWalletConnection(true)
    }
  }

  async finalizeWalletConnection(newWcSession){
    const chainInfo = await getChainInfo(
      config.defaultChainId,
      config.chainInfoOverrides
    )

    walletClient = await this.getClient(
      chainInfo,
      walletConnect,
      newWcSession
    )
    if (!walletClient) {
      throw new Error('Failed to retrieve wallet client.')
    }

    // Enable and connect to wallet, and retrieve data.
    const connectedWallet = await getConnectedWalletInfo(
      wallet,
      walletClient,
      chainInfo,
      await config.getSigningCosmWasmClientOptions?.(chainInfo),
      await config.getSigningStargateClientOptions?.(chainInfo)
    )
    // Add refresh listener to update connected wallet info.
    wallet.addRefreshListener?.(refreshListener)

    // Allow to fail silently.
    try {
      await wallet.cleanupClient?.(walletClient)

      // Save localStorage value for future autoconnection.
      if (config.localStorageKey) {
        localStorage.setItem(config.localStorageKey, wallet.id)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }

    updateState({
      status: CosmosWalletStatus.Connected,
      connectedWallet,
    })
  }
}