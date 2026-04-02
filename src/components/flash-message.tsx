type Flash = {
  kind: "success" | "error";
  message: string;
};

type FlashMessageProps = {
  flash: Flash | null;
  className?: string;
};

export function FlashMessage({ flash, className }: FlashMessageProps) {
  if (!flash) {
    return null;
  }

  const tone = flash.kind === "success" ? "success" : "danger";
  const classes = className ? `${className} alert alert-${tone} mb-0` : `alert alert-${tone} mb-0`;

  return <div className={classes}>{flash.message}</div>;
}
