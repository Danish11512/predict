import type { StreamRequestEvent } from '$lib/interfaces/streamTypes'

export type IntroPageProps = {
	currentRequest: StreamRequestEvent | null
	otpSubmitting: boolean
	onOtpSubmit: (value: string) => void
}
