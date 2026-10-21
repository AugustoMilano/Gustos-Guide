import { useLocation } from 'react-router-dom'
import { cityFromPath, type CityId } from './city.ts'

export function useCityId(): CityId {
  const { pathname } = useLocation()
  return cityFromPath(pathname)
}
