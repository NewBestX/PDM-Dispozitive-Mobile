import React, {useContext, useState} from 'react';
import PropTypes from 'prop-types';
import {Redirect, Route} from 'react-router-dom';
import {AuthContext, AuthState} from './AuthProvider';
import {getLogger} from '../core';
import {Plugins} from '@capacitor/core';

const {Storage} = Plugins;

const log = getLogger('Login');

export interface PrivateRouteProps {
    component: PropTypes.ReactNodeLike;
    path: string;
    exact?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({component: Component, ...rest}) => {
    const ctx = useContext<AuthState>(AuthContext);
    log('render, isAuthenticated', ctx.isAuthenticated);
    return (
        <Route {...rest} render={props => {
            if (ctx.isAuthenticated) {
                // @ts-ignore
                return <Component {...props} />;
            }
            return <Redirect to={{pathname: '/login'}}/>
        }}/>
    );
}
