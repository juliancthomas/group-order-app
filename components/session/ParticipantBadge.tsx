import { Badge } from "@/components/ui/badge";

type ParticipantBadgeProps = {
  email: string;
  isHost: boolean;
};

export function ParticipantBadge({ email, isHost }: ParticipantBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={isHost ? "default" : "accent"}>{isHost ? "Host" : "Guest"}</Badge>
      <span className="text-sm font-medium text-brand-dark">{email}</span>
    </div>
  );
}
