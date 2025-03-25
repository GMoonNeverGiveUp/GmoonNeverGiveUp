import React from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '../pages/api/discord/userStore';

const withRole = (Component, allowedRoles) => {
  return function WrappedComponent(props) {
    const user = useStore(userStore);
    if (!user || !allowedRoles.includes(user.role)) {
      return <div>Access Denied</div>;
    }
    return <Component {...props} />;
  };
};
export default withRole;