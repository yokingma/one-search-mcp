#!/usr/bin/env node
interface IMediaItem {
    thumbnail?: string;
    src?: string;
}
interface ISearchRequestOptions {
    query: string;
    page?: number;
    limit?: number;
    categories?: string;
    format?: string;
    language?: string;
    engines?: string;
    safeSearch?: number;
    timeRange?: string;
    timeout?: number | string;
    apiKey?: string;
    apiUrl?: string;
}
interface ISearchResponseResult {
    title: string;
    snippet: string;
    url: string;
    markdown?: string;
    source?: string;
    engine?: string;
    image?: IMediaItem | null;
    video?: IMediaItem | null;
}
interface ISearchResponse {
    results: ISearchResponseResult[];
    success: boolean;
}
type Provider = 'searxng' | 'google' | 'bing' | 'tavily';
type SearchTimeRange = 'year' | 'month' | 'week' | 'day';

export type { IMediaItem, ISearchRequestOptions, ISearchResponse, ISearchResponseResult, Provider, SearchTimeRange };
