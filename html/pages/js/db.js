/**
 * db.js — IndexedDB helper
 *
 * CLASS EXPLANATION:
 * IndexedDB is a small database inside the browser (not a server).
 * 1. openDatabase() creates / opens "FitnessDB"
 * 2. put() saves one object
 * 3. getAll() reads every object in a table (store)
 *
 * We keep this file small. storage.js still uses localStorage,
 * and also copies important data here.
 */
(function (root) {
  'use strict';

  var DB_NAME = 'FitnessDB';
  var DB_VERSION = 3;
  var db = null;

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (db) {
        resolve(db);
        return;
      }
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      // First time (or version change): create tables
      request.onupgradeneeded = function (event) {
        var database = event.target.result;
        var tables = ['users', 'workouts', 'weightRecords', 'waterRecords', 'goals', 'settings', 'userSongs'];
        tables.forEach(function (name) {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = function () {
        db = request.result;
        resolve(db);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function put(storeName, value) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        store.put(value);
        tx.oncomplete = function () { resolve(value); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getAll(storeName) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var tx = database.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function clear(storeName) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var tx = database.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  root.FitnessDB = {
    openDatabase: openDatabase,
    add: put,
    put: put,
    getAll: getAll,
    update: put,
    delete: function (storeName, id) {
      return openDatabase().then(function (database) {
        return new Promise(function (resolve, reject) {
          var tx = database.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).delete(id);
          tx.oncomplete = function () { resolve(); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    },
    clear: clear
  };
})(typeof window !== 'undefined' ? window : this);
