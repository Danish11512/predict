import { env } from '$env/dynamic/public'

export const publicApiBaseUrl = (): string => {
	const b = env.PUBLIC_API_BASE_URL
	return (typeof b === 'string' && b.length > 0 ? b : 'http://localhost:8000').replace(/\/$/, '')
}
