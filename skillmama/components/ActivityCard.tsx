import { DOMAIN_LABEL, type Activity } from "../lib/types";

export function ActivityCard({
  activity,
  done,
  onDone,
}: {
  activity: Activity;
  done?: boolean;
  onDone?: (activity: Activity) => void;
}) {
  const why =
    activity.whyItHelps ??
    "It fits this age as a short, quiet invitation, with one thing to do and time to wait.";

  return (
    <article className="activity" data-done={done ? "true" : "false"}>
      <header>
        <h3>{activity.title}</h3>
        <span className="meta">{activity.minutes} min</span>
      </header>
      <p className="domain">{DOMAIN_LABEL[activity.domain]}</p>
      {activity.nearbyAge ? (
        <p className="nearby">Close to this age, because the matching ones are already done.</p>
      ) : null}
      <h4>How to prepare</h4>
      <p>{activity.materials}</p>
      <h4>How to offer it</h4>
      <p>{activity.howToOffer}</p>
      <h4>What you might notice</h4>
      <p>{activity.whatToNotice}</p>
      <h4>Why it helps</h4>
      <p>{why}</p>
      {done ? (
        <button type="button" disabled>
          Done
        </button>
      ) : (
        <button type="button" onClick={() => onDone?.(activity)}>
          We did this
        </button>
      )}
    </article>
  );
}
