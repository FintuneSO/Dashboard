import { useState } from "react";
export function useAppliedFilters(initial) {
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState(initial);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(applied);
  function setDraftField(key, value) {
    setDraft((d) => ({
      ...d,
      [key]: value,
    }));
  }
  function apply() {
    setApplied(draft);
  }
  function setField(key, value) {
    setDraft((d) => ({
      ...d,
      [key]: value,
    }));
    setApplied((a) => ({
      ...a,
      [key]: value,
    }));
  }
  return {
    draft,
    applied,
    isDirty,
    setDraftField,
    apply,
    setField,
  };
}
