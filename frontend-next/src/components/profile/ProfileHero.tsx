import { IconTerminal, IconCode, IconCalendar } from "@/components/Icons";

interface ProfileHeroProps {
  username: string;
  initial: string;
}

export function ProfileHero({ username, initial }: ProfileHeroProps) {
  return (
    <div className="profile-hero fade-in-up">
      <div className="avatar-ring">
        <div className="avatar-inner">{initial}</div>
        <div className="avatar-status" />
      </div>
      <h2 className="profile-name">{username}</h2>
      <p className="profile-handle">@{username.toLowerCase()}</p>
      <p className="profile-bio">
        Competitive programmer | Algorithm enthusiast | Learning something new
        every day
      </p>
      <div className="profile-tags">
        <span className="profile-tag">
          <IconTerminal
            style={{
              width: 14,
              height: 14,
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />{" "}
          Python
        </span>
        <span className="profile-tag">
          <IconCode
            style={{
              width: 14,
              height: 14,
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />{" "}
          C++
        </span>
        <span className="profile-tag">
          <IconCalendar
            style={{
              width: 14,
              height: 14,
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />{" "}
          Joined 2025
        </span>
      </div>
    </div>
  );
}
