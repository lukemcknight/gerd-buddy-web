import { useCallback, useEffect, useState } from "react";
import { getUser } from "../services/storage";

export const useStoredUser = () => {
  const [user, setUser] = useState(null);

  const reload = useCallback(async () => {
    const profile = await getUser();
    setUser(profile);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { user, reload };
};

export default useStoredUser;
