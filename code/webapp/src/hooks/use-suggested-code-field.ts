import { type ChangeEventHandler, useEffect, useRef, useState } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import type { UseSuggestedCodeResult } from '@/hooks/use-suggested-code'

export interface SuggestedCodeCollision {
  rejectedCode: string
  suggestedCode: string
}

interface UseSuggestedCodeFieldOptions {
  isEditing: boolean
  contextKey?: string
  canPrefill?: boolean
  suggestion: Pick<UseSuggestedCodeResult, 'suggestedCode' | 'refresh'>
  codeField: UseFormRegisterReturn<'code'>
  writeCode: (code: string, shouldValidate: boolean) => void
  normalizeCode?: (code: string) => string
  onManualEditChange?: (manuallyEdited: boolean) => void
  clearValidationOnManualCollision?: boolean
}

/**
 * Coordinates a suggested `code` field without overwriting operator input.
 * It also keeps collision replacements pinned only while their semantic context remains current.
 */
export function useSuggestedCodeField({
  isEditing,
  contextKey = '',
  canPrefill = true,
  suggestion,
  codeField,
  writeCode,
  normalizeCode = (code) => code,
  onManualEditChange,
  clearValidationOnManualCollision = false,
}: Readonly<UseSuggestedCodeFieldOptions>) {
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const codeManuallyEditedRef = useRef(false)
  const contextKeyRef = useRef(contextKey)
  const previousContextKeyRef = useRef(contextKey)
  contextKeyRef.current = contextKey
  const [pinnedCode, setPinnedCode] = useState<{ code: string; contextKey: string } | null>(null)
  const [storedCollision, setStoredCollision] = useState<{
    collision: SuggestedCodeCollision
    contextKey: string
  } | null>(null)
  const collision = storedCollision?.contextKey === contextKey ? storedCollision.collision : null
  const contextualCode = (pinnedCode?.contextKey === contextKey ? pinnedCode.code : null) ?? suggestion.suggestedCode
  const prefillCode = canPrefill ? contextualCode : undefined

  const setManualEdited = (value: boolean) => {
    codeManuallyEditedRef.current = value
    setCodeManuallyEdited(value)
    onManualEditChange?.(value)
  }

  useEffect(() => {
    const contextChanged = previousContextKeyRef.current !== contextKey
    previousContextKeyRef.current = contextKey
    if (contextChanged) {
      setPinnedCode(null)
      setStoredCollision(null)
    }
    if (!isEditing && !codeManuallyEdited && prefillCode) {
      writeCode(prefillCode, false)
    } else if (!isEditing && !codeManuallyEdited && contextChanged) {
      writeCode('', false)
    }
  }, [contextKey, isEditing, codeManuallyEdited, prefillCode, writeCode])

  const onCodeChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    event.target.value = normalizeCode(event.target.value)
    void codeField.onChange(event)
    setManualEdited(true)
    setPinnedCode(null)
    setStoredCollision(null)
  }

  const handleRefreshCode = () => {
    setManualEdited(false)
    setPinnedCode(null)
    setStoredCollision(null)
    suggestion.refresh()
  }

  const acceptCollision = (next: SuggestedCodeCollision, clearValidationErrors: () => void) => {
    if (contextKeyRef.current !== contextKey) return
    setStoredCollision({ collision: next, contextKey })
    if (!codeManuallyEditedRef.current || clearValidationOnManualCollision) {
      clearValidationErrors()
    }
    if (!codeManuallyEditedRef.current) {
      setPinnedCode({ code: next.suggestedCode, contextKey })
      writeCode(next.suggestedCode, false)
    }
  }

  const applySuggestedCode = (clearValidationErrors: () => void) => {
    if (!collision) return
    writeCode(collision.suggestedCode, true)
    setPinnedCode({ code: collision.suggestedCode, contextKey })
    setManualEdited(false)
    setStoredCollision(null)
    clearValidationErrors()
  }

  const clearSuggestionState = () => {
    setStoredCollision(null)
    setPinnedCode(null)
  }

  return {
    codeManuallyEdited,
    prefillCode,
    collision,
    onCodeChange,
    handleRefreshCode,
    acceptCollision,
    applySuggestedCode,
    clearSuggestionState,
  }
}
