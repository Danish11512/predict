import type { AppHeaderDomElementId } from '$lib/constants/appHeader'

export const isEventTargetInsideElementId = (evt: Event, elementId: AppHeaderDomElementId): boolean => {
	const target = evt.target
	if (!(target instanceof Node)) return false

	const root = document.getElementById(elementId)
	if (!root) return false

	return root.contains(target)
}
