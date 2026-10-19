import type { ImgHTMLAttributes } from "react";
export default function Image({
  unoptimized: _unoptimized,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) {
  void _unoptimized;
  // Next image optimization is outside this isolated component fixture.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} />;
}
