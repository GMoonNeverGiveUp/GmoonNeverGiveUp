import { useEffect, useState, useCallback } from "react";
import {
  initOnChain,
  loadFeed,
  onNewMeme,
  mintFreeMeme,
  voteMeme,
  impulseMeme
} from "../lib/chain";

// Suppose you have a MemeBuilder component somewhere:
import MemeBuilder from "../components/MemeBuilder";

function Meme({ tokenId, creator, cid, onVote, onImpulse }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let canceled = false;
    fetch(`https://ipfs.io/ipfs/${cid}/metadata.json`)
      .then((res) => res.json())
      .then((data) => {
        if (!canceled) setMeta(data);
      })
      .catch((err) => {
        if (!canceled) setError(err.toString());
      });
    return () => {
      canceled = true;
    };
  }, [cid]);

  if (error) return <div>Error loading meme #{tokenId}: {error}</div>;

  return (
    <div className="meme-card">
      {meta ? (
        <>
          <img src={`https://ipfs.io/ipfs/${cid}/${meta.image}`} alt={meta.name} />
          <h3>{meta.name}</h3>
          <p>{meta.description}</p>
        </>
      ) : (
        <p>Loading metadata…</p>
      )}
      <small>By {creator}</small>
      <div className="actions">
        <button onClick={() => onVote(tokenId, "10")}>Vote +10</button>
        <button onClick={() => onImpulse(tokenId, "5")}>Impulse +5</button>
      </div>
    </div>
  );
}

export default function Frontend() {
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);

  // Mint handler
  const handleMint = useCallback(
    async (memeData) => {
      try {
        setIsMinting(true);
        setError(null);
        const receipt = await mintFreeMeme(memeData);
        console.log("Minted:", receipt);
      } catch (err) {
        console.error("Mint error:", err);
        setError("Failed to mint meme: " + err.toString());
      } finally {
        setIsMinting(false);
      }
    },
    []
  );

  // Vote / Impulse handlers
  const handleVote = useCallback((id, amt) => {
    voteMeme(id, amt).catch((err) =>
      console.error(`Vote ${amt} on #${id} failed:`, err)
    );
  }, []);

  const handleImpulse = useCallback((id, amt) => {
    impulseMeme(id, amt).catch((err) =>
      console.error(`Impulse ${amt} on #${id} failed:`, err)
    );
  }, []);

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        await initOnChain();
        const initial = await loadFeed();
        setFeed(initial);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to load on-chain feed: " + err.toString());
      } finally {
        setLoadingFeed(false);
      }
      // subscribe to new memes
      unsub = onNewMeme((m) => {
        setFeed((f) => [m, ...f]);
      });
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  if (loadingFeed) return <p>Loading on-chain feed…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Mint a Free Meme</h2>
      <MemeBuilder onMint={handleMint} disabled={isMinting} />
      {isMinting && <p>Minting… please wait.</p>}

      <hr />

      <h2>Latest Memes</h2>
      {feed.length === 0 ? (
        <p>No memes yet—be the first!</p>
      ) : (
        feed.map((m) => (
          <Meme
            key={m.tokenId}
            tokenId={m.tokenId}
            creator={m.creator}
            cid={m.cid}
            onVote={handleVote}
            onImpulse={handleImpulse}
          />
        ))
      )}
    </div>
  );
}
