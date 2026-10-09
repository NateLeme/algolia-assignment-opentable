import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { METRO_PRESETS, type UserLocation } from '../lib/location';

// Custom combobox: click to browse every metro, or type to narrow the list.
// Keyboard: ↑/↓ to move, Enter to pick, Esc to close. Unknown text reverts on close.

const USE_MY_LOCATION = { label: 'Use my location', restaurants: null } as const;

interface Props {
  location: UserLocation;
  onChoosePreset: (label: string) => void;
  onUseMyLocation: () => void;
}

export function LocationPicker({ location, onChoosePreset, onUseMyLocation }: Props) {
  const [text, setText] = useState(location.label);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false); // false = show the full list (just opened)
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => setText(location.label), [location.label]);

  // Keep the keyboard-highlighted option visible in the scrolling list.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  const options = useMemo(() => {
    const t = text.trim().toLowerCase();
    const metros = filtering && t ? METRO_PRESETS.filter((m) => m.label.toLowerCase().includes(t)) : METRO_PRESETS;
    return [USE_MY_LOCATION, ...metros];
  }, [text, filtering]);

  const close = () => {
    setOpen(false);
    setFiltering(false);
    setText(location.label); // nothing picked → show the current location again
  };

  const pick = (option: (typeof options)[number]) => {
    setOpen(false);
    setFiltering(false);
    if (option === USE_MY_LOCATION) {
      setText(location.label);
      onUseMyLocation();
    } else {
      setText(option.label);
      onChoosePreset(option.label);
    }
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      // While typing, Enter picks the first matching metro rather than "Use my location".
      const index = filtering && active === 0 && options.length > 1 ? 1 : active;
      if (options[index]) pick(options[index]);
    } else if (e.key === 'Escape') {
      close();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="location">
      <span className="location-pin" aria-hidden>⌖</span>
      <input
        ref={inputRef}
        className="location-input"
        role="combobox"
        aria-label="Search near"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        placeholder="City or metro area"
        value={text}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setFiltering(true);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={close}
      />
      <button
        type="button"
        className="location-toggle"
        aria-label="Show locations"
        tabIndex={-1}
        // Keep focus in the input so the list doesn't close before the toggle runs.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? close() : inputRef.current?.focus())}
      >
        ▾
      </button>

      {open && (
        <ul className="location-list" id={listId} role="listbox">
          {options.length === 1 && <li className="location-empty">No matching metro area</li>}
          {options.map((option, i) => (
            <li
              key={option.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`location-option ${i === active ? 'is-active' : ''} ${option === USE_MY_LOCATION ? 'is-mine' : ''}`}
              // mousedown + preventDefault: pick before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{option.label}</span>
              {option.restaurants !== null && <span className="location-count">{option.restaurants}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
