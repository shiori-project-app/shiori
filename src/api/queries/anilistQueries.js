const MEDIA_FIELDS = `fragment M on Media {
  id idMal
  streamingEpisodes { title thumbnail }
  relations { edges { relationType node { type format } } }
  title { romaji english native }
  synonyms
  genres averageScore popularity episodes duration status format season seasonYear
  startDate { year month day }
  endDate { year month day }
  description(asHtml: false)
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt }
  coverImage { large extraLarge }
  bannerImage
}`;

export const LIST_QUERY = `query ($page: Int, $per: Int, $sort: [MediaSort], $search: String, $genre: String, $formats: [MediaFormat], $season: MediaSeason, $year: Int, $statuses: [MediaStatus], $minPopularity: Int, $startedBefore: FuzzyDateInt, $endedAfter: FuzzyDateInt, $excludedGenres: [String]) {
  Page(page: $page, perPage: $per) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, isAdult: false, sort: $sort, search: $search, genre: $genre, format_in: $formats, season: $season, seasonYear: $year, status_in: $statuses, popularity_greater: $minPopularity, startDate_lesser: $startedBefore, endDate_greater: $endedAfter, genre_not_in: $excludedGenres) { ...M }
  }
}
${MEDIA_FIELDS}`;

const homeList = (name, per, filters) =>
  `${name}: Page(perPage: ${per}) { media(type: ANIME, isAdult: false, format_in: $formats, genre_not_in: $excludedGenres, ${filters}) { ...M } }`;

export const HOME_LISTS_QUERY = `query ($formats: [MediaFormat], $minPopularity: Int, $excludedGenres: [String]) {
  ${homeList('newest', 18, 'sort: START_DATE_DESC, status_in: [RELEASING, FINISHED], popularity_greater: $minPopularity')}
  ${homeList('popular', 18, 'sort: POPULARITY_DESC')}
  ${homeList('topRated', 18, 'sort: SCORE_DESC')}
  ${homeList('topAiring', 5, 'sort: SCORE_DESC, status: RELEASING, popularity_greater: $minPopularity')}
  ${homeList('upcoming', 5, 'sort: POPULARITY_DESC, status: NOT_YET_RELEASED')}
  ${homeList('topMovies', 5, 'sort: SCORE_DESC, format: MOVIE')}
  ${homeList('justFinished', 5, 'sort: END_DATE_DESC, status: FINISHED, popularity_greater: $minPopularity')}
}
${MEDIA_FIELDS}`;

export const TRENDS_QUERY = `query ($from: Int, $to: Int) {
  Page(perPage: 50) {
    mediaTrends(date_greater: $from, date_lesser: $to, sort: [TRENDING_DESC]) { mediaId trending media { type isAdult } }
  }
}`;

export const SCHEDULE_QUERY = `query ($from: Int, $to: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: [TIME]) { id episode airingAt media { ...M isAdult } }
  }
}
${MEDIA_FIELDS}`;

export const BY_IDS_QUERY = `query ($ids: [Int]) {
  Page(perPage: 50) { media(id_in: $ids, type: ANIME) { ...M } }
}
${MEDIA_FIELDS}`;

export const BY_MAL_IDS_QUERY = `query ($ids: [Int]) {
  Page(perPage: 50) { media(idMal_in: $ids, type: ANIME) { ...M } }
}
${MEDIA_FIELDS}`;

export const RELATIONS_QUERY = `query ($id: Int) {
  Media(id: $id) { relations { edges { relationType node { id format episodes title { romaji english } } } } }
}`;

export const FRANCHISE_QUERY = `query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      relations { edges { relationType node { id type format relations { edges { relationType node { id type format } } } } } }
    }
  }
}`;

export const AIRING_SCHEDULE_QUERY = `query ($id: Int) {
  Media(id: $id) { airingSchedule(perPage: 50) { nodes { episode airingAt } } }
}`;

export const USER_LIST_QUERY = `query ($user: String) {
  MediaListCollection(userName: $user, type: ANIME) {
    lists { entries { status progress media { id } } }
  }
}`;

export const RECOMMENDATIONS_QUERY = `query ($id: Int) {
  Media(id: $id) { recommendations(perPage: 8, sort: RATING_DESC) { nodes { mediaRecommendation { ...M } } } }
}
${MEDIA_FIELDS}`;

export const SUGGESTIONS_QUERY = `query ($search: String, $excludedGenres: [String]) {
  Page(perPage: 6) {
    media(type: ANIME, isAdult: false, search: $search, sort: SEARCH_MATCH, genre_not_in: $excludedGenres) { title { romaji english } }
  }
}`;
