package handler

import (
	"net/http"
	"strconv"

	db "alumni-albahjah/db/sqlc"
	"alumni-albahjah/internal/util"
)

type ContentHandler struct {
	queries db.Querier
}

func NewContentHandler(queries db.Querier) *ContentHandler {
	return &ContentHandler{queries: queries}
}

func parsePagination(r *http.Request) (limit, offset int32) {
	limit = 10
	offset = 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 50 {
			limit = int32(v)
		}
	}
	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 1 {
			offset = int32((v - 1)) * limit
		}
	}
	return
}

// GET /api/public/news
func (h *ContentHandler) ListNews(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	news, err := h.queries.ListNews(r.Context(), db.ListNewsParams{Limit: limit, Offset: offset})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil berita")
		return
	}
	if news == nil {
		news = []db.ListNewsRow{}
	}

	// Normalize sql.NullString fields to plain strings for JSON response
	type NewsItem struct {
		ID        string  `json:"id"`
		Title     string  `json:"title"`
		Slug      string  `json:"slug"`
		Thumbnail *string `json:"thumbnail"`
		Category  *string `json:"category"`
		Published bool    `json:"published"`
		CreatedAt string  `json:"created_at"`
	}

	result := make([]NewsItem, len(news))
	for i, n := range news {
		item := NewsItem{
			ID:        n.ID,
			Title:     n.Title,
			Slug:      n.Slug,
			Published: n.Published,
			CreatedAt: n.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if n.Thumbnail.Valid {
			item.Thumbnail = &n.Thumbnail.String
		}
		if n.Category.Valid {
			item.Category = &n.Category.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"news":  result,
		"limit": limit,
	})
}

// GET /api/public/news/{slug}
func (h *ContentHandler) GetNews(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if slug == "" {
		util.WriteError(w, http.StatusBadRequest, "Slug tidak valid")
		return
	}
	news, err := h.queries.GetNewsBySlug(r.Context(), slug)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Berita tidak ditemukan")
		return
	}

	type NewsDetail struct {
		ID         string  `json:"id"`
		Title      string  `json:"title"`
		Slug       string  `json:"slug"`
		Content    string  `json:"content"`
		Thumbnail  *string `json:"thumbnail"`
		Category   *string `json:"category"`
		Published  bool    `json:"published"`
		CreatedAt  string  `json:"created_at"`
		AuthorName *string `json:"author_name"`
	}

	item := NewsDetail{
		ID:        news.ID,
		Title:     news.Title,
		Slug:      news.Slug,
		Content:   news.Content,
		Published: news.Published,
		CreatedAt: news.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if news.Thumbnail.Valid {
		item.Thumbnail = &news.Thumbnail.String
	}
	if news.Category.Valid {
		item.Category = &news.Category.String
	}
	if news.AuthorName.Valid {
		item.AuthorName = &news.AuthorName.String
	}

	util.WriteSuccess(w, http.StatusOK, "", item)
}

// GET /api/public/events
func (h *ContentHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	events, err := h.queries.ListEvents(r.Context(), db.ListEventsParams{Limit: limit, Offset: offset})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil events")
		return
	}
	if events == nil {
		events = []db.ListEventsRow{}
	}

	// Normalize sql.NullString fields to plain strings for JSON response
	type EventItem struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		EventType   string  `json:"event_type"`
		ZoomLink    *string `json:"zoom_link"`
		StartTime   string  `json:"start_time"`
		EndTime     *string `json:"end_time"`
		Thumbnail   *string `json:"thumbnail"`
		CreatedAt   string  `json:"created_at"`
	}

	result := make([]EventItem, len(events))
	for i, e := range events {
		item := EventItem{
			ID:        e.ID,
			Title:     e.Title,
			EventType: string(e.EventType),
			StartTime: e.StartTime.Format("2006-01-02T15:04:05Z07:00"),
			CreatedAt: e.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if e.Description.Valid {
			item.Description = &e.Description.String
		}
		if e.Location.Valid {
			item.Location = &e.Location.String
		}
		if e.ZoomLink.Valid {
			item.ZoomLink = &e.ZoomLink.String
		}
		if e.EndTime.Valid {
			t := e.EndTime.Time.Format("2006-01-02T15:04:05Z07:00")
			item.EndTime = &t
		}
		if e.Thumbnail.Valid {
			item.Thumbnail = &e.Thumbnail.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"events": result,
		"limit":  limit,
	})
}

// GET /api/public/events/{id}
func (h *ContentHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	event, err := h.queries.GetEventByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Event tidak ditemukan")
		return
	}

	type EventDetail struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		EventType   string  `json:"event_type"`
		ZoomLink    *string `json:"zoom_link"`
		StartTime   string  `json:"start_time"`
		EndTime     *string `json:"end_time"`
		Thumbnail   *string `json:"thumbnail"`
		CreatedAt   string  `json:"created_at"`
	}

	item := EventDetail{
		ID:        event.ID,
		Title:     event.Title,
		EventType: string(event.EventType),
		StartTime: event.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		CreatedAt: event.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if event.Description.Valid {
		item.Description = &event.Description.String
	}
	if event.Location.Valid {
		item.Location = &event.Location.String
	}
	if event.ZoomLink.Valid {
		item.ZoomLink = &event.ZoomLink.String
	}
	if event.EndTime.Valid {
		t := event.EndTime.Time.Format("2006-01-02T15:04:05Z07:00")
		item.EndTime = &t
	}
	if event.Thumbnail.Valid {
		item.Thumbnail = &event.Thumbnail.String
	}

	util.WriteSuccess(w, http.StatusOK, "", item)
}
