import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', () => {
  let map = null
  let container = null

  function updateMap(mapIns) {
    map = mapIns
  }

  function getMap() {
    return map
  }

  function updateContainer(con) {
    container = con
  }

  function getContainer() {
    return container
  }

  return { updateMap, getMap, updateContainer, getContainer }
})
