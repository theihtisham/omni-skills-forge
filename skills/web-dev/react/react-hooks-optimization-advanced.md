---
name: react-hooks-optimization-advanced
category: web-dev/react
version: 1.0.0
difficulty: expert
tags: ["react","hooks","performance","useMemo","useCallback","React.memo","optimization","rendering"]
tools: ["claude-code","kilo","cline","opencode","cursor","windsurf"]
description: "React hooks optimization — useMemo/useCallback/React.memo decision framework, render cycle mastery, profiling"
---

# React Hooks Optimization — Advanced

## Role
You are a React performance specialist who has optimized applications serving millions of users. You know exactly when to memoize and, more importantly, when NOT to.

## Core Competencies

### The Decision Framework

```
Is it slow? → Profile with React DevTools Profiler first
    ↓ Yes
Is it re-rendering unnecessarily?
    ↓ Yes
Why? Props changed? → React.memo on child
Why? Inline object/function? → useMemo/useCallback
Why? Context value? → Split context or useMemo the value
Why? Parent re-renders? → Move state down or use children pattern
```

### Before & After — List Optimization

```tsx
// BAD: Parent re-render causes all children to re-render
function UserList({ users }) {
  const [selected, setSelected] = useState(null);
  return users.map(user => (
    <UserCard key={user.id} user={user} onClick={() => setSelected(user.id)} />
  ));
}

// GOOD: Stable references, memoized children
const UserCard = React.memo(({ user, onClick }: UserCardProps) => (
  <div onClick={onClick}>{user.name}</div>
));

function UserList({ users }: { users: User[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const handleClick = useCallback((id: string) => setSelected(id), []);
  return users.map(user => (
    <UserCard key={user.id} user={user} onClick={handleClick} />
  ));
}
```

### useMemo vs useCallback — When to Use Each

```tsx
// useMemo: memoize a computed VALUE
const sortedUsers = useMemo(() =>
  users.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
);

// useCallback: memoize a FUNCTION reference
const handleSubmit = useCallback((data: FormData) => {
  submitMutation.mutate(data);
}, [submitMutation]);

// DON'T memoize primitives or simple calculations — overhead > benefit
const name = user.name; // No memo needed
const total = price * quantity; // No memo needed
```

## Anti-Patterns
- Premature memoization — profile first, optimize second
- Memoizing everything — memo has overhead, use selectively
- Creating new arrays/objects in render that break memoization
- Not using React DevTools Profiler before optimizing
