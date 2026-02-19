export const formatDateTime = (value) => {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatDate = (value) => {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatHour = (value) => {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};
