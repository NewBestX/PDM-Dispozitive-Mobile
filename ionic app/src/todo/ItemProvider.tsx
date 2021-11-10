import React, {useCallback, useContext, useEffect, useReducer} from 'react';
import PropTypes from 'prop-types';
import {getLogger} from '../core';
import {ItemProps} from './ItemProps';
import {createItem, getItems, getItemsPage, newWebSocket, updateItem} from './itemApi';
import {AuthContext} from '../auth';

const log = getLogger('ItemProvider');

type SaveItemFn = (item: ItemProps) => Promise<any>;

export interface ItemsState {
    items?: ItemProps[],
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    saveItem?: SaveItemFn,
    serverOnline: boolean,
    failedToSyncItems?: ItemProps[],
    page: number,
    disableInfiniteScroll: boolean,
    searchNextFn: (x: CustomEvent<void>) => (void),
    filter: string,
    dispatch?: any,
    needMoreItems: boolean,
}

interface ActionProps {
    type: string,
    payload?: any,
}

const initialState: ItemsState = {
    fetching: false,
    saving: false,
    serverOnline: true,
    page: 1,
    disableInfiniteScroll: false,
    searchNextFn: () => {
    },
    filter: "",
    needMoreItems: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_DONE = 'SAVE_ITEM_DONE';
const FETCH_ITEMS_INVALID_TOKEN = 'FETCH_ITEMS_INVALID_TOKEN';
const FILTER_CHANGED = 'FILTER_CHANGED';
const LOGOUT = 'LOGOUT';

const reducer: (state: ItemsState, action: ActionProps) => ItemsState =
    (state, {type, payload}) => {
        console.log("ItemState reducer, type: " + type.toString());
        switch (type) {
            case LOGOUT:
                return initialState;
            case FILTER_CHANGED:
                log("FILTRU NOU:" + payload.filter);
                return {...state, page: 1, filter: payload.filter, items: [], disableInfiniteScroll: false};
            case FETCH_ITEMS_STARTED:
                return {...state, fetching: true, fetchingError: null};
            case FETCH_ITEMS_SUCCEEDED:
                return {
                    ...state,
                    items: payload.items,
                    fetching: false,
                    serverOnline: true,
                    failedToSyncItems: payload.failedToSyncLocal,
                    disableInfiniteScroll: payload.amount < 10,
                    page: state.page + 1,
                    needMoreItems: (payload.items.length < 11 && payload.amount == 10) ? !state.needMoreItems : state.needMoreItems,
                };
            case FETCH_ITEMS_INVALID_TOKEN:
                payload();
                return {...state, fetching: false};
            case FETCH_ITEMS_FAILED:
                return {
                    ...state,
                    items: payload.items,
                    fetchingError: payload.error,
                    fetching: false,
                    serverOnline: false,
                    page: payload.amount === 10 ? state.page + 1 : state.page,
                };
            case SAVE_ITEM_STARTED:
                return {...state, savingError: null, saving: true};
            case SAVE_ITEM_DONE:
                const items = [...(state.items || [])];
                const item = payload.item;
                const ftsi = state.failedToSyncItems?.filter(x => x._id !== item._id);
                log('IN SAVE ITEM DONE::')
                log(item)
                if (!item._id) {
                    if (payload.error)
                        item._id = Math.random().toString();
                    else
                        return state;
                }
                const index = items.findIndex(it => it._id === item._id);
                if (index === -1) {
                    items.splice(0, 0, item);
                } else {
                    items[index] = item;
                }
                localStorage.setItem('items', JSON.stringify(items))
                if (payload.error)
                    return {
                        ...state,
                        items,
                        saving: false,
                        serverOnline: false,
                        failedToSyncItems: [],
                    };
                else
                    return {
                        ...state,
                        items,
                        saving: false,
                        serverOnline: true,
                        failedToSyncItems: ftsi,
                    };
            default:
                return state;
        }
    };

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
    children: PropTypes.ReactNodeLike,
}

export const ItemProvider: React.FC<ItemProviderProps> = ({children}) => {
    const {token, logout} = useContext(AuthContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        items,
        fetching,
        fetchingError,
        saving,
        savingError,
        serverOnline,
        failedToSyncItems,
        page,
        disableInfiniteScroll,
        filter,
        needMoreItems,
    } = state;
    useEffect(getItemsEffect, [token, serverOnline, filter, needMoreItems]);
    useEffect(wsEffect, [token]);
    const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token]);
    const value = {
        items,
        fetching,
        fetchingError,
        saving,
        savingError,
        saveItem,
        serverOnline,
        failedToSyncItems,
        page,
        disableInfiniteScroll,
        searchNextFn: searchNext,
        filter,
        dispatch,
        needMoreItems,
    };

    // Nu pot testa... merge cu 'offline' sau 'online'
    //window.addEventListener('online', () => {
    //Do task when internet connection returns
    //});

    log('returns');
    return (
        <ItemContext.Provider value={value}>
            {children}
        </ItemContext.Provider>
    );

    function getItemsEffect() {
        let canceled = false;
        fetchItems();
        return () => {
            canceled = true;
        }

        async function fetchItems() {
            if (!token?.trim()) {
                return;
            }
            try {
                log('fetchItems started, page:' + state.page);
                dispatch({type: FETCH_ITEMS_STARTED});

                const failedToSync = await syncItems();
                log("sync: failed for items: " + failedToSync.length);

                const lsItemsLen = JSON.parse(localStorage.getItem('items') as string)?.length;
                const lastEdit : number | undefined = JSON.parse(localStorage.getItem('lastEdit') as string);
                log("TAG: " + lastEdit + " " + lsItemsLen + " > " + page * 10);
                let p;

                if(lastEdit && failedToSync.length === 0 && lsItemsLen && lsItemsLen > (page-1) * 10) { // am in local storage suficiente items deja
                    log("TAG aici")
                    p = await getItemsPage(token, page, lastEdit); // Verific daca sunt modificari
                    // De aici ar trebui sa iasa in catch cu status 304
                } else {
                    p = await getItemsPage(token, page, -1);
                }
                // Daca ajunge aici, am primit items noi (au fost modificari)

                let items : ItemProps[] = p.items;
                let svLastEdit : number = p.lastEdit;

                const amount = items.length;
                if (state.items)
                    items = state.items.concat(items);

                let failedToSyncLocal: ItemProps[] = state.failedToSyncItems? state.failedToSyncItems : [];

                for (const x of failedToSync) {
                    if (x && !failedToSyncLocal.includes(x))
                        failedToSyncLocal.push(x);
                }
                log("sync: failedToSyncSTATE, " + (state.failedToSyncItems? JSON.stringify(state.failedToSyncItems) : 0));
                log("sync: failedToSyncLocal, " + failedToSyncLocal.length);


                log('fetchItems succeeded');
                if (!canceled) {
                    localStorage.setItem('items', JSON.stringify(items))
                    localStorage.setItem('lastEdit', JSON.stringify(svLastEdit));

                    if (state.filter.length > 0)
                        items = items.filter(x => x.titlu.startsWith(state.filter));

                    dispatch({type: FETCH_ITEMS_SUCCEEDED, payload: {items, failedToSyncLocal, amount}});
                }
            } catch (error) {
                // if(error.request) ==> nu s-a primit raspuns, server offline
                log('fetchItems failed, message:' + error.message);
                if (error.response?.data?.message === "Authentication Error") {
                    dispatch({type: FETCH_ITEMS_INVALID_TOKEN, payload: logout});
                    return;
                }

                let items: ItemProps[] = JSON.parse(localStorage.getItem('items') as string);
                if(!items) {
                    dispatch({type: FETCH_ITEMS_FAILED, payload: {items: [], error: error}});
                    return;
                }

                items = items.slice(0, page * 10);

                if (state.filter.length > 0)
                    items = items.filter(x => x.titlu.startsWith(state.filter));

                if(error.response?.status === 304) {
                    log("Nicio modificare, status 304, folosesc local storage, item len " + (items.length - ((page - 1) * 10)));
                    dispatch({type: FETCH_ITEMS_SUCCEEDED, payload: {items: items, failedToSyncItems: [], amount: items.length - ((page - 1) * 10)}});
                }else {
                    dispatch({type: FETCH_ITEMS_FAILED, payload: {items: items, error: error, amount: items.length - ((page - 1) * 10)}});
                }
            }
        }
    }

    async function saveItemCallback(item: ItemProps) {
        try {
            dispatch({type: SAVE_ITEM_STARTED});
            const savedItem = await (item._id ? updateItem(token, item) : createItem(token, item));
            log('>>> saveItem, id:' + item._id)
            dispatch({type: SAVE_ITEM_DONE, payload: {item: savedItem}});
        } catch (error) {
            log('saveItem failed');
            dispatch({
                type: SAVE_ITEM_DONE,
                payload: {error: error, item: {...item, hasLocalEdits: true}}
            });
        }
    }

    function wsEffect() {
        let canceled = false;
        log('wsEffect - connecting');
        let closeWebSocket: () => void;
        if (token?.trim()) {
            closeWebSocket = newWebSocket(token, message => {
                if (canceled) {
                    return;
                }
                const {type, payload: item} = message;
                log(`>>> ws message, item ${type}`);
                if (type === 'created' || type === 'updated') {
                    log('ws, id:' + item._id)
                    dispatch({type: SAVE_ITEM_DONE, payload: {item: item}});
                }
            });
        }
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket?.();
        }
    }

    async function syncItems(): Promise<ItemProps[]> {
        log('sync items')
        let lsItms: ItemProps[] | undefined = JSON.parse(localStorage.getItem('items') as string);
        if (!lsItms)
            return [];
        const toSync: ItemProps[] = lsItms.filter(x => x.hasLocalEdits);
        log('to sync: ' + toSync.length);

        let failedToSync: ItemProps[] = [];
        for (const x of toSync) {
            //const index = itms.findIndex(y => y && y._id === x._id);

            //if (index !== -1 && x.lastEditDate < itms[index].lastEditDate)
            //    continue;

            const {hasLocalEdits, ...toSave} = x;

            try {
                if (!toSave._id || toSave._id.startsWith("0.")) {
                    await updateItem(token, {
                        ...toSave,
                        _id: undefined
                    })
                } else {
                    await updateItem(token, toSave);
                }
            } catch (error) {
                if (error.response?.data?.message === "ItemUpdate: Old resource")
                    failedToSync.push(toSave);
                if (!error.message || !error.message.includes("status code 40")) {
                    throw error;
                }
            }
        }
        return failedToSync;
    }

    async function searchNext($event: CustomEvent<void>) {
        log("Search next, page: " + state.page);
        await getItemsEffect();
        await ($event.target as HTMLIonInfiniteScrollElement).complete();
    }
};
