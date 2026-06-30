# Developing a Metadata-Based Sound Effect Recommendation Feature for Arsonus Using Content-Based Filtering and User Behavior Analysis


# Abstract
The rapid growth of digital content production has increased the demand for sound effects and music assets in videos, podcasts, games, animation, advertising, and social media content. However, users often experience difficulty finding suitable audio assets because many platforms still rely on keyword-based search. This approach becomes limited when users do not know the exact terms that describe the sound they need. This paper proposes the development of a metadata-based sound effect recommendation feature for Arsonus, a web-based audio asset marketplace, using Content-Based Filtering and user behavior analysis. The proposed system represents audio assets using metadata such as title, category, tags, genres, mood, duration, license type, access level, and description. User behavior data, including searches, clicks, preview plays, wishlist actions, cart additions, downloads, and purchases, is treated as implicit feedback to construct a user preference profile. The system then calculates similarity between user profiles and audio asset vectors using cosine similarity to generate Top-N recommendations. The proposed evaluation includes Precision@K, NDCG@K, response time, and User Acceptance Testing. This study contributes a practical recommendation design that can be integrated into Arsonus to improve audio discovery, reduce search effort, and personalize the browsing experience.

Keywords: Arsonus, sound effect recommendation, Content-Based Filtering, implicit feedback, user behavior analysis, cosine similarity, multimedia retrieval, recommender system.

# 1. Introduction
Digital multimedia production has expanded rapidly across online video, games, podcasts, animation, advertising, and short-form social media content. In these creative workflows, sound effects and music assets are not merely decorative elements; they support storytelling, build atmosphere, strengthen emotion, and improve user experience. As audio asset libraries grow, users need more efficient ways to discover suitable sounds.

Arsonus is a web-based platform developed as a Project Based Learning application for managing and selling sound effects and music assets. The platform includes user authentication, browse and search features, audio preview, wishlist, cart, checkout, subscription, creator studio, admin panel, categories, tags, and payment integration. Although these features already support audio asset distribution, the discovery process can still be improved through a recommendation feature.

Many audio platforms rely on keyword-based search. Keyword search is useful when users know the correct terms, but it becomes less effective when the user only understands the desired atmosphere or use case. For example, a user may need an audio asset for a horror scene but may not know whether to search for dark ambience, scary wind, cinematic tension, or forest night. Information retrieval literature explains that query formulation strongly affects search effectiveness because search results depend on the match between user queries and item representations (Manning, Raghavan, & Schutze, 2008; Baeza-Yates & Ribeiro-Neto, 2011).

Recommender systems provide a solution for helping users discover relevant items from large collections. Adomavicius and Tuzhilin (2005) classify recommendation approaches into content-based, collaborative, and hybrid methods. Content-Based Filtering is suitable for Arsonus because audio assets contain rich metadata such as title, category, tags, duration, description, mood, genre, and license type. A user profile can be built from interactions with these metadata attributes and compared against item vectors to recommend similar assets (Pazzani & Billsus, 2007; Lops, de Gemmis, & Semeraro, 2011).

This study proposes a metadata-based recommendation feature for Arsonus using Content-Based Filtering and user behavior analysis. User behavior is treated as implicit feedback, following the idea that clicks, searches, views, and purchases can indicate preference even when explicit ratings are not available (Hu, Koren, & Volinsky, 2008; Rendle et al., 2009). The recommendation model is designed to generate personalized audio asset suggestions based on user interaction history and item metadata.

# 2. Research Questions and Objectives
This study is guided by the following research questions:

1. How can a metadata-based recommendation feature be designed for the Arsonus audio marketplace?
2. How can user behavior be used as implicit feedback to construct user preference profiles?
3. How can Content-Based Filtering and cosine similarity be applied to recommend relevant sound effects and music assets?
4. How can the recommendation feature be evaluated using accuracy, ranking quality, response time, and user acceptance?

The objectives of this study are:

1. To design a recommendation feature that integrates with the existing Arsonus platform.
2. To represent audio assets using metadata such as category, tags, mood, genre, duration, title, and description.
3. To model user preferences from behavior logs such as search, click, preview, wishlist, cart, download, and purchase activities.
4. To generate Top-N audio recommendations using Content-Based Filtering and cosine similarity.
5. To define an evaluation method using Precision@K, NDCG@K, response time, and User Acceptance Testing.

# 3. Literature Review
## 3.1 Recommender Systems
A recommender system is designed to help users identify relevant items from a large collection. Recommender systems have been widely used in e-commerce, movie platforms, music streaming, news portals, learning systems, and multimedia platforms. Resnick and Varian (1997) introduced recommender systems as systems that support users in filtering information and selecting items based on preference. Adomavicius and Tuzhilin (2005) describe three major approaches: Collaborative Filtering, Content-Based Filtering, and Hybrid Recommendation.

Collaborative Filtering recommends items based on similarities among users or item interaction patterns. However, collaborative methods usually require a sufficient amount of user-item interaction data. Content-Based Filtering recommends items by matching user profiles with item descriptions or attributes. Hybrid recommendation combines multiple approaches to improve recommendation quality (Burke, 2002; Bobadilla et al., 2013; Ricci, Rokach, & Shapira, 2022).

## 3.2 Content-Based Filtering
Content-Based Filtering recommends items similar to those that a user previously liked or interacted with. Pazzani and Billsus (2007) explain that content-based recommendation systems use item descriptions and user profiles to identify relevant items. Lops et al. (2011) describe two main components of Content-Based Filtering: item representation and user profile representation. Items are represented through their attributes, while user profiles are built from user preferences or interaction history.

In the context of Arsonus, Content-Based Filtering is suitable because audio assets have metadata. Metadata such as title, category, tags, mood, genre, duration, license type, and description can be converted into feature vectors. The system can then compare these vectors with user preference vectors to produce recommendations. Lops et al. (2019) emphasize that rich item descriptions can support modern content-based recommendation, especially when item metadata is meaningful.

## 3.3 User Behavior Analysis and Implicit Feedback
User preferences can be collected through explicit feedback or implicit feedback. Explicit feedback includes ratings, reviews, or likes. Implicit feedback is inferred from user behavior such as clicks, searches, views, purchases, downloads, and repeated interactions. Hu et al. (2008) explain that implicit feedback indicates user preference with varying confidence levels. Rendle et al. (2009) also show that implicit feedback can support personalized ranking.

Arsonus can collect several types of implicit feedback: search keywords, sound detail clicks, audio preview plays, preview duration, wishlist actions, cart additions, downloads, purchases, and frequently accessed categories. Each behavior can be assigned a weight according to its preference strength. For example, a download or purchase indicates stronger preference than a simple search.

## 3.4 Audio Metadata and Sound Effect Retrieval
Sound effects differ from music because they are often shorter, more contextual, and used for specific scenes or actions. Sound effect discovery depends heavily on descriptive metadata such as event type, ambience, object, environment, mood, duration, and use case. Public audio datasets such as AudioSet, Freesound Datasets, FSD50K, UrbanSound8K, and ESC-50 show that audio data can be organized using labels, tags, and event categories (Gemmeke et al., 2017; Fonseca et al., 2017; Fonseca et al., 2022; Salamon et al., 2014; Piczak, 2015).

For Arsonus, metadata is not only useful for search but also for recommendation. Audio item features can be extracted from title, category, tags, mood, genre, description, duration, and license type. Textual metadata can be represented using TF-IDF, while categorical metadata can be represented using one-hot encoding. Numerical metadata such as duration can be normalized or grouped into short, medium, and long classes.

## 3.5 Cosine Similarity and Ranking Evaluation
Cosine similarity is commonly used to compare vector representations in information retrieval and recommender systems. It measures similarity based on vector direction rather than magnitude. This makes it suitable for comparing text-based or metadata-based vectors (Manning et al., 2008). In this study, cosine similarity compares the user preference vector and audio asset vectors.

Recommendation quality can be evaluated using ranking metrics. Precision@K measures how many recommended items among the top K are relevant. NDCG@K evaluates ranking quality by giving higher value to relevant items that appear at the top of the list (Jarvelin & Kekalainen, 2002). Herlocker et al. (2004) also argue that recommender system evaluation should consider user tasks and user experience, not only prediction accuracy.

# 4. Related Work and Research Gap
Previous studies provide a strong foundation for recommender systems, Content-Based Filtering, implicit feedback, audio datasets, and evaluation. However, the application of recommendation systems to a practical web-based sound effect marketplace remains more specific than common recommendation domains such as movies, products, or music.

The research gap in this study can be summarized as follows:

1. Many audio asset platforms still depend on keyword search, which requires users to know the correct search terms.
2. Sound effects are different from music because they are shorter, more contextual, and scene-oriented.
3. Arsonus already stores useful metadata and user interaction data, but this data has not been fully used for personalized recommendation.
4. User behavior such as preview, wishlist, cart, download, and purchase can be transformed into implicit feedback for recommendation.
5. A practical recommendation feature must consider not only accuracy but also response time and user acceptance.

The contribution of this study is the design of a recommendation feature that connects Content-Based Filtering theory with the actual Arsonus platform architecture.

# 5. Proposed System: Arsonus Recommendation Feature
The proposed system is integrated into Arsonus as a recommendation module. Arsonus already includes audio browsing, search, preview, wishlist, cart, checkout, subscription, creator upload, and admin management. The recommendation feature can use these existing modules as data sources.

The proposed recommendation feature consists of five main components:

1. Audio Metadata Collector: collects metadata from uploaded audio assets, including title, description, category, tags, mood, genre, duration, access level, price, and license type.
2. User Behavior Logger: records user interactions such as search, click, preview, wishlist, cart addition, download, and purchase.
3. Feature Vector Builder: converts metadata and user behavior into vector representations.
4. Recommendation Engine: calculates cosine similarity between user profile vectors and audio asset vectors.
5. Recommendation UI: displays recommended assets in sections such as Recommended for You, Similar Sounds, Trending in Your Interest, and More Like This.

The recommendation feature can be implemented in several pages: Home page for Recommended for You, Browse page for personalized suggestions, Sound Detail page for Similar Sounds, and Search page for suggestion refinement.

# 6. Data Model and Feature Representation
## 6.1 Audio Asset Metadata
Each audio item is represented using metadata fields: audio ID, title, description, category, category type, tags, mood, genre, duration, access level, license type, creator ID, play count, and download count.

## 6.2 User Behavior Log
User behavior is recorded as implicit feedback. The proposed behavior log stores log ID, user ID, audio asset ID, action type, search keyword, category slug, tags involved, weight, and timestamp.

## 6.3 Behavior Weighting
Different behaviors represent different preference strengths. The proposed weighting scheme is shown in the table below.

# 7. Recommendation Algorithm
The recommendation algorithm follows a Content-Based Filtering process. First, each audio asset is transformed into an item vector. Textual features such as title, description, and tags are processed using tokenization and TF-IDF. Categorical features such as category, mood, genre, access level, and license type are represented using one-hot encoding. Duration can be normalized or grouped into short, medium, and long classes.

Second, the system constructs a user profile vector from behavior logs. Each interaction contributes to the user profile according to its behavior weight. For example, if a user frequently previews and downloads horror ambience assets, the user profile will contain stronger weights for horror, ambience, dark, cinematic, and related tags.

Third, cosine similarity is calculated between the user profile vector and each candidate audio vector. The system ranks items by similarity score and returns the Top-N recommendations.

Cosine similarity formula:

similarity(A, B) = (A dot B) / (||A|| x ||B||)

Pseudocode:

Input: user_id, behavior_logs, audio_metadata, N
Output: Top-N recommended audio assets

1. Retrieve user behavior logs for user_id.
2. Assign weight to each behavior based on action type.
3. Build user preference vector from weighted metadata terms.
4. Build item vectors from audio metadata.
5. Exclude items already downloaded or purchased by the user.
6. Calculate cosine similarity between user vector and each item vector.
7. Sort items by similarity score in descending order.
8. Return top N audio assets.

# 8. System Architecture
The proposed architecture follows the existing Arsonus web application structure. The frontend is built using Next.js and React, while the backend uses NestJS and Prisma ORM. The database stores audio assets, categories, tags, users, orders, subscriptions, downloads, and behavior logs.

The recommendation flow is:

1. User interacts with Arsonus through browse, search, preview, wishlist, cart, or download features.
2. Backend records user behavior into the behavior log table.
3. Recommendation service builds user preference vectors.
4. Recommendation API returns Top-N recommended assets.
5. Frontend displays recommendations in relevant pages.

Suggested API endpoints include GET /recommendations/me, GET /recommendations/similar/:audioId, POST /recommendations/log-behavior, and GET /recommendations/trending.

Suggested database entities include audio_assets, categories, tags, audio_asset_tags, user_behavior_logs, user_preference_profiles, and recommendation_results.

# 9. Evaluation Method
The recommendation feature should be evaluated from both algorithmic and user-oriented perspectives.

## 9.1 Precision@K
Precision@K measures the proportion of relevant items among the top K recommendations. If 7 out of 10 recommended assets are relevant, Precision@10 is 0.7.

Precision@K = Number of relevant recommended items / K

## 9.2 NDCG@K
NDCG@K evaluates ranking quality. It gives higher value when relevant items appear near the top of the recommendation list. This metric is useful because users usually pay more attention to the first few recommendations (Jarvelin & Kekalainen, 2002).

## 9.3 Response Time
Response time measures how long the system takes to return recommendation results. Because Arsonus is a web application, the recommendation API should return results quickly. A target response time below two seconds is recommended for a smooth user experience.

## 9.4 User Acceptance Testing
User Acceptance Testing evaluates whether the recommendation feature is useful and easy to use. The questionnaire can be based on perceived usefulness and perceived ease of use from the Technology Acceptance Model (Davis, 1989). The System Usability Scale can also be used to interpret usability scores (Bangor, Kortum, & Miller, 2009).

Suggested UAT statements using a 1-5 Likert scale:

1. The recommended audio assets match my needs.
2. The recommendations are relevant to my search history.
3. The recommendation feature helps me find sounds faster.
4. The recommended assets match my preferred category, mood, or genre.
5. The recommendation interface is easy to understand.
6. I would use the recommendation feature again.

# 10. Implementation Plan in Arsonus
The implementation can be divided into four phases.

Phase 1: Behavior Logging. The backend records user behavior from existing features. Search, preview, wishlist, cart, download, and purchase actions are stored as behavior logs.

Phase 2: Metadata Vectorization. The system processes audio metadata. Tags, category, mood, genre, title, and description are converted into feature vectors. A simple first version can use weighted keyword matching and one-hot encoding. A more advanced version can add TF-IDF.

Phase 3: Recommendation API. A recommendation service calculates similarity scores and returns Top-N recommendations. The first implementation can calculate scores on request. If the dataset becomes larger, the system can cache user profiles or precompute recommendation results.

Phase 4: Frontend Integration. The frontend displays recommendation sections on the browse page, home page, and sound detail page. The UI should show why an item is recommended, for example: Because you previewed horror ambience sounds or Similar to rain ambience.

# 11. Expected Contribution and Discussion
The proposed recommendation feature is expected to improve the Arsonus user experience by reducing dependency on keyword search. Instead of requiring users to know exact sound-related terms, the system can infer user preferences from interaction patterns. This is useful for creative users who search based on mood, scene, atmosphere, or project context.

The use of Content-Based Filtering is appropriate for the current stage of Arsonus because it can work even when the number of users is still limited. Collaborative Filtering usually requires many users and interaction records, while Content-Based Filtering can use existing audio metadata. This makes the proposed method practical for a PBL project and scalable for future development.

However, the quality of recommendations depends on metadata quality. Inconsistent tags, incomplete descriptions, or poorly organized categories can reduce recommendation relevance. Therefore, metadata standardization and category management are important parts of the system.

Future development can include a hybrid recommendation model that combines Content-Based Filtering with collaborative signals such as popular downloads, trending categories, and users with similar behavior. Audio feature extraction using tools such as Essentia or Librosa may also be explored for automatic mood, tempo, or acoustic feature analysis (Bogdanov et al., 2013; McFee et al., 2015).

# 12. Conclusion
This paper proposes the development of a metadata-based sound effect recommendation feature for Arsonus using Content-Based Filtering and user behavior analysis. The proposed system uses audio metadata such as title, category, tags, mood, genre, duration, and description to represent each audio asset. User behavior such as search, click, preview, wishlist, cart, download, and purchase is treated as implicit feedback to construct user preference profiles.

Cosine similarity is used to compare user profile vectors with audio asset vectors and generate Top-N recommendations. The feature can be integrated into Arsonus through recommendation APIs and recommendation UI sections such as Recommended for You and Similar Sounds. The proposed evaluation includes Precision@K, NDCG@K, response time, and User Acceptance Testing.

The study shows that Arsonus has strong potential for recommendation-based feature development because it already contains audio metadata and user interaction data. With proper implementation and evaluation, the recommendation feature can improve audio discovery, reduce search effort, and provide a more personalized user experience.

# References
- Adomavicius, G., & Tuzhilin, A. (2005). Toward the next generation of recommender systems: A survey of the state-of-the-art and possible extensions. IEEE Transactions on Knowledge and Data Engineering, 17(6), 734-749. https://doi.org/10.1109/TKDE.2005.99
- Aggarwal, C. C. (2016). Recommender Systems: The Textbook. Springer. https://doi.org/10.1007/978-3-319-29659-3
- Baeza-Yates, R., & Ribeiro-Neto, B. (2011). Modern Information Retrieval: The Concepts and Technology Behind Search (2nd ed.). Addison-Wesley.
- Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. Journal of Usability Studies, 4(3), 114-123.
- Bobadilla, J., Ortega, F., Hernando, A., & Gutierrez, A. (2013). Recommender systems survey. Knowledge-Based Systems, 46, 109-132. https://doi.org/10.1016/j.knosys.2013.03.012
- Bogdanov, D., Wack, N., Gomez, E., Gulati, S., Herrera, P., Mayor, O., Roma, G., Salamon, J., Zapata, J. R., & Serra, X. (2013). Essentia: An audio analysis library for music information retrieval. Proceedings of the 14th International Society for Music Information Retrieval Conference, 493-498.
- Burke, R. (2002). Hybrid recommender systems: Survey and experiments. User Modeling and User-Adapted Interaction, 12(4), 331-370. https://doi.org/10.1023/A:1021240730564
- Casey, M. A., Veltkamp, R. C., Goto, M., Leman, M., Rhodes, C., & Slaney, M. (2008). Content-based music information retrieval: Current directions and future challenges. Proceedings of the IEEE, 96(4), 668-696. https://doi.org/10.1109/JPROC.2008.916370
- Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319-340. https://doi.org/10.2307/249008
- Fonseca, E., Pons, J., Favory, X., Font, F., Bogdanov, D., Ferraro, A., Oramas, S., Porter, A., & Serra, X. (2017). Freesound Datasets: A platform for the creation of open audio datasets. Proceedings of the 18th International Society for Music Information Retrieval Conference, 486-493.
- Fonseca, E., Favory, X., Pons, J., Font, F., & Serra, X. (2022). FSD50K: An open dataset of human-labeled sound events. IEEE/ACM Transactions on Audio, Speech, and Language Processing, 30, 829-852. https://doi.org/10.1109/TASLP.2021.3133208
- Font, F., Roma, G., & Serra, X. (2013). Freesound technical demo. Proceedings of the 21st ACM International Conference on Multimedia, 411-412. https://doi.org/10.1145/2502081.2502245
- Gemmeke, J. F., Ellis, D. P. W., Freedman, D., Jansen, A., Lawrence, W., Moore, R. C., Plakal, M., & Ritter, M. (2017). Audio Set: An ontology and human-labeled dataset for audio events. 2017 IEEE International Conference on Acoustics, Speech and Signal Processing, 776-780. https://doi.org/10.1109/ICASSP.2017.7952261
- Herlocker, J. L., Konstan, J. A., Terveen, L. G., & Riedl, J. T. (2004). Evaluating collaborative filtering recommender systems. ACM Transactions on Information Systems, 22(1), 5-53. https://doi.org/10.1145/963770.963772
- Hu, Y., Koren, Y., & Volinsky, C. (2008). Collaborative filtering for implicit feedback datasets. 2008 Eighth IEEE International Conference on Data Mining, 263-272. https://doi.org/10.1109/ICDM.2008.22
- Jarvelin, K., & Kekalainen, J. (2002). Cumulated gain-based evaluation of IR techniques. ACM Transactions on Information Systems, 20(4), 422-446. https://doi.org/10.1145/582415.582418
- Lops, P., de Gemmis, M., & Semeraro, G. (2011). Content-based recommender systems: State of the art and trends. In F. Ricci, L. Rokach, B. Shapira, & P. B. Kantor (Eds.), Recommender Systems Handbook (pp. 73-105). Springer. https://doi.org/10.1007/978-0-387-85820-3_3
- Lops, P., Jannach, D., Musto, C., Bogers, T., & Koolen, M. (2019). Trends in content-based recommendation. User Modeling and User-Adapted Interaction, 29, 239-249. https://doi.org/10.1007/s11257-019-09231-w
- Manning, C. D., Raghavan, P., & Schutze, H. (2008). Introduction to Information Retrieval. Cambridge University Press.
- McFee, B., Raffel, C., Liang, D., Ellis, D. P. W., McVicar, M., Battenberg, E., & Nieto, O. (2015). Librosa: Audio and music signal analysis in Python. Proceedings of the 14th Python in Science Conference, 18-25. https://doi.org/10.25080/Majora-7b98e3ed-003
- Pazzani, M. J., & Billsus, D. (2007). Content-based recommendation systems. In P. Brusilovsky, A. Kobsa, & W. Nejdl (Eds.), The Adaptive Web (pp. 325-341). Springer. https://doi.org/10.1007/978-3-540-72079-9_10
- Piczak, K. J. (2015). ESC: Dataset for environmental sound classification. Proceedings of the 23rd ACM International Conference on Multimedia, 1015-1018. https://doi.org/10.1145/2733373.2806390
- Rendle, S., Freudenthaler, C., Gantner, Z., & Schmidt-Thieme, L. (2009). BPR: Bayesian personalized ranking from implicit feedback. Proceedings of the 25th Conference on Uncertainty in Artificial Intelligence, 452-461.
- Resnick, P., & Varian, H. R. (1997). Recommender systems. Communications of the ACM, 40(3), 56-58. https://doi.org/10.1145/245108.245121
- Ricci, F., Rokach, L., & Shapira, B. (Eds.). (2022). Recommender Systems Handbook (3rd ed.). Springer. https://doi.org/10.1007/978-1-0716-2197-4
- Salamon, J., Jacoby, C., & Bello, J. P. (2014). A dataset and taxonomy for urban sound research. Proceedings of the 22nd ACM International Conference on Multimedia, 1041-1044. https://doi.org/10.1145/2647868.2655045
- Schedl, M., Zamani, H., Chen, C.-W., Deldjoo, Y., & Elahi, M. (2018). Current challenges and visions in music recommender systems research. International Journal of Multimedia Information Retrieval, 7, 95-116. https://doi.org/10.1007/s13735-018-0154-2
- Zhang, S., Yao, L., Sun, A., & Tay, Y. (2019). Deep learning based recommender system: A survey and new perspectives. ACM Computing Surveys, 52(1), Article 5. https://doi.org/10.1145/3285029