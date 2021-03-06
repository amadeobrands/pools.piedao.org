import jazzicon from "jazzicon";

import { ethers } from "ethers";
import { get } from "svelte/store";
import { shortenAddress } from "@pie-dao/utils";

import { defaultEth, eth } from "./writables.js";
import { bumpLifecycle, updateCurrentBlock } from "./lifecycle.js";
import { resetContractCache } from "./contracts.js";

export const defaultProvider = new ethers.providers.InfuraProvider('homestead', 'e106b2b27c0f4941be1f2c183a20b3ea');
defaultProvider.on("block", updateCurrentBlock);

eth.set({ ...get(eth), provider: defaultProvider });

const resetWeb3Listeners = () => {
  const { provider, web3 } = get(eth);

  if (provider) {
    provider.off("block", updateCurrentBlock);
    defaultProvider.on("block", updateCurrentBlock);
  }

  if (web3) {
    web3.off("accountsChanged", connectWeb3);
    web3.off("chainChanged", resetWeb3);
    web3.off("disconnect", resetWeb3);
  }
};

const setWeb3Listeners = () => {
  const { provider, web3 } = get(eth);

  if (provider) {
    defaultProvider.off("block", updateCurrentBlock);
    provider.on("block", updateCurrentBlock);
  }

  if (web3) {
    web3.on("accountsChanged", () => registerConnection());
    web3.on("chainChanged", resetConnection);
    web3.on("disconnect", resetConnection);
  }
};

export const registerConnection = async (newWeb3) => {
  const web3 = newWeb3 || get(eth).web3;

  if (!web3) {
    throw new Error("Unable to find a web3 object. Was one passed?");
  }

  const provider = new ethers.providers.Web3Provider(web3);
  const signer = provider.getSigner();

  const [currentBlockNumber, network, address] = await Promise.all([
    provider.getBlockNumber(),
    provider.getNetwork(),
    signer.getAddress(),
  ]);

  const shortAddress = shortenAddress(address);
  const icon = jazzicon(16, parseInt(address.slice(2, 10), 16)).outerHTML;


  eth.set({
    address,
    currentBlockNumber,
    icon,
    network,
    provider,
    shortAddress,
    signer,
    web3,
  });

  setWeb3Listeners();
  bumpLifecycle();
};

export const resetConnection = () => {
  resetWeb3Listeners();
  resetContractCache();
  eth.set({ ...defaultEth, provider: defaultProvider });
};
