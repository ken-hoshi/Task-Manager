export const fetchData = async () => {
    const res = await fetch("/api/data");
    return res.json();
  };
