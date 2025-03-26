// src/components/MintProfile.jsx
import React, { useEffect } from 'react';
import { ethers } from 'ethers';
import { useStore } from '@nanostores/react';
import { userStore } from '../stores/userStore';

const LocalMintProfile = () => {
  const currentUser = useStore(userStore);

  useEffect(() => {
    if (!currentUser) {
      window.location.href = '/api/discord/login';
    }
  }, [currentUser]);

  const mintSBT = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      // Use a public environment variable for the SBT address
      const sbtAddress = import.meta.env.PUBLIC_SBT_ADDRESS || 'YOUR_SBT_ADDRESS';
      const sbtContract = new ethers.Contract(
        sbtAddress,
        ['function mint(address to)'],
        signer
      );
      const tx = await sbtContract.mint(await signer.getAddress());
      await tx.wait();
      alert('SBT Minted Successfully!');
    } catch (error) {
      console.error(error);
      alert('Error minting SBT');
    }
  };

  return (
    <div>
      <h1>Mint Your Profile Soul Bound Token</h1>
      <p>Welcome, {currentUser?.username}!</p>
      <p>Your role: {currentUser?.role}</p>
      <button onClick={mintSBT}>Mint SBT</button>
    </div>
  );
};

export default MintProfile;
