import {
  ArrowUpRight,
  Check,
  CirclePlus,
  Rss,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';
import { PROVIDERS, type Kind } from '../../shared/model';
import { Button, SourceIcon } from './ui';
export function StarterFeed({
  onConnect,
  onBackground,
}: {
  onConnect: (kind?: Kind) => void;
  onBackground: () => void;
}) {
  return (
    <div className="starter-layout">
      <section className="starter-card">
        <span className="eyebrow">
          <span className="blue-dot" /> A FEED THAT BELONGS TO YOU
        </span>
        <div className="starter-illustration">
          <span className="orbit orbit-one">
            <Rss size={24} />
          </span>
          <span className="orbit orbit-two">
            <BookOpen size={23} />
          </span>
          <span className="orbit orbit-three">
            <Sparkles size={24} />
          </span>
          <span className="feed-glyph">
            <i />
            <i />
            <i />
            <b />
          </span>
          <span className="orbit-line one" />
          <span className="orbit-line two" />
        </div>
        <h2>
          Your internet.
          <br />
          <span>All in one place.</span>
        </h2>
        <p>
          Bring the voices you follow, the stories you read, and the conversations that matter into
          your own feed.
        </p>
        <Button onClick={() => onConnect()}>
          <CirclePlus size={17} /> Connect your first source <ArrowRight size={16} />
        </Button>
        <small>Start with one connection. Add more when you’re ready.</small>
        <div className="starter-divider" />
        <div className="starter-points">
          <span>
            <Check size={14} /> Your sources
          </span>
          <span>
            <Check size={14} /> Your filters
          </span>
          <span>
            <Check size={14} /> Your pace
          </span>
        </div>
      </section>
      <aside className="starter-aside">
        <div className="section-label">A FEW PLACES TO START</div>
        {(['rss', 'mastodon', 'bluesky', 'email', 'rocket'] as const).map((kind) => (
          <button className="starter-source" key={kind} onClick={() => onConnect(kind)}>
            <SourceIcon kind={kind} />
            <span>
              <strong>{PROVIDERS[kind].name}</strong>
              <small>{PROVIDERS[kind].description}</small>
            </span>
            <ArrowUpRight size={15} />
          </button>
        ))}
        <div className="starter-tip">
          <SlidersHorizontal size={19} />
          <h3>
            A little less noise.
            <br />A little more you.
          </h3>
          <p>Add background context and set your filters to shape what makes it into your feed.</p>
          <button className="text-button" onClick={onBackground}>
            Explore customization <ArrowRight size={13} />
          </button>
        </div>
      </aside>
    </div>
  );
}
