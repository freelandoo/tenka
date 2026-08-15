import type { SVGProps } from 'react';

/** Geometric TENKA symbol, built from the proportions of the approved mark. */
export default function TenkaSymbol(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 8h86L65 50l28 42H7l28-42L7 8Zm21 15h18L37 43 28 23Zm26 0h18l-9 20-9-20ZM50 38l12 19-12 19-12-19 12-19ZM37 65l10 20H24l13-20Zm26 0 13 20H53l10-20Z"
      />
    </svg>
  );
}
