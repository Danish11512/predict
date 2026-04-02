export const isEventTargetInsideElementId = (evt: Event, elementId: string): boolean => {
	const target = evt.target
	if (!(target instanceof Node)) return false

	const root = document.getElementById(elementId)
	if (!root) return false

	return root.contains(target)
}

