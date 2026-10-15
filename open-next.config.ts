import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js"

// Defaults suit Lambda behind CloudFront. No tag cache: the app has no ISR or revalidateTag.
const config = {
  default: {},
  dangerous: {
    disableTagCache: true,
  },
} satisfies OpenNextConfig

export default config
