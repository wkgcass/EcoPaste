import { useAsyncEffect, useKeyPress, useReactive } from "ahooks";
import { Tag } from "antd";
import clsx from "clsx";
import { useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Scrollbar from "@/components/Scrollbar";
import { LISTEN_KEY } from "@/constants";
import { selectHistory } from "@/database/history";
import { useTauriListen } from "@/hooks/useTauriListen";
import type { DatabaseSchemaGroup } from "@/types/database";
import { scrollElementToCenter } from "@/utils/dom";
import { MainContext } from "../..";

const GroupList = () => {
  const { rootState } = useContext(MainContext);
  const { t } = useTranslation();
  const favoriteGroups = useReactive<string[]>([]);

  useEffect(() => {
    scrollElementToCenter(rootState.group);
  }, [rootState.group]);

  const presetGroups: DatabaseSchemaGroup[] = [
    {
      id: "all",
      name: t("clipboard.label.tab.all"),
    },
    {
      id: "text",
      name: t("clipboard.label.tab.text"),
    },
    {
      id: "image",
      name: t("clipboard.label.tab.image"),
    },
    {
      id: "files",
      name: t("clipboard.label.tab.files"),
    },
    {
      id: "favorite",
      name: t("clipboard.label.tab.favorite"),
    },
  ];

  // 从数据库查询所有收藏夹分组名称
  const loadFavoriteGroups = async () => {
    const list = await selectHistory((qb) =>
      qb
        .select("favoriteGroup")
        .where("favorite", "=", true)
        .where("favoriteGroup", "is not", null)
        .where("favoriteGroup", "!=", ""),
    );

    const groups = [
      ...new Set(list.map((item) => item.favoriteGroup).filter(Boolean)),
    ].sort() as string[];

    favoriteGroups.splice(0, favoriteGroups.length, ...groups);
  };

  useAsyncEffect(async () => {
    await loadFavoriteGroups();
  }, [rootState.group]);

  useTauriListen(LISTEN_KEY.REFRESH_CLIPBOARD_LIST, loadFavoriteGroups);

  // 当切换到非收藏分组时，清除 favoriteGroup
  useEffect(() => {
    if (rootState.group !== "favorite") {
      rootState.favoriteGroup = undefined;
    }
  }, [rootState.group]);

  useKeyPress("tab", (event) => {
    // 在收藏夹模式下，如果有子分组，Tab 切换子分组
    if (rootState.group === "favorite" && favoriteGroups.length > 0) {
      const subGroups = ["_default_", ...favoriteGroups];
      const currentIndex = rootState.favoriteGroup
        ? subGroups.indexOf(rootState.favoriteGroup)
        : -1;

      let nextIndex: number;

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          // 第一个子分组再 Shift+Tab，跳到收藏前一个外层标签
          const favIdx = presetGroups.findIndex((g) => g.id === "favorite");

          rootState.group = presetGroups[favIdx - 1].id;

          return;
        }

        nextIndex = currentIndex - 1;
      } else {
        if (currentIndex >= subGroups.length - 1) {
          // 最后一个子分组再 Tab，跳到外层第一个标签
          rootState.group = presetGroups[0].id;

          return;
        }

        nextIndex = currentIndex + 1;
      }

      rootState.favoriteGroup = subGroups[nextIndex];
      return;
    }

    const index = presetGroups.findIndex((item) => item.id === rootState.group);
    const length = presetGroups.length;

    let nextIndex = index;

    if (event.shiftKey) {
      nextIndex = index === 0 ? length - 1 : index - 1;
    } else {
      nextIndex = index === length - 1 ? 0 : index + 1;
    }

    rootState.group = presetGroups[nextIndex].id;

    // Tab 切换到收藏标签时
    if (presetGroups[nextIndex].id === "favorite") {
      if (event.shiftKey && favoriteGroups.length > 0) {
        // Shift+Tab：选中最后一个自定义收藏夹
        rootState.favoriteGroup = favoriteGroups[favoriteGroups.length - 1];
      } else {
        // Tab 正向：选中默认收藏夹
        rootState.favoriteGroup = "_default_";
      }
    }
  });

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <Scrollbar className="flex" data-tauri-drag-region>
        {presetGroups.map((item) => {
          const { id, name } = item;

          const isChecked = id === rootState.group;

          return (
            <div id={id} key={id}>
              <Tag.CheckableTag
                checked={isChecked}
                className={clsx({ "bg-primary!": isChecked })}
                onChange={() => {
                  rootState.group = id;

                  if (id === "favorite") {
                    rootState.favoriteGroup = "_default_";
                  }
                }}
              >
                {name}
              </Tag.CheckableTag>
            </div>
          );
        })}
      </Scrollbar>

      {rootState.group === "favorite" && favoriteGroups.length > 0 && (
        <Scrollbar className="flex" data-tauri-drag-region>
          <Tag.CheckableTag
            checked={
              rootState.favoriteGroup === "_default_" ||
              !rootState.favoriteGroup
            }
            className={clsx({
              "bg-red!":
                rootState.favoriteGroup === "_default_" ||
                !rootState.favoriteGroup,
            })}
            onChange={() => {
              rootState.favoriteGroup = "_default_";
            }}
          >
            {t("clipboard.label.tab.favorite_default")}
          </Tag.CheckableTag>
          {favoriteGroups.map((groupName) => (
            <div key={groupName}>
              <Tag.CheckableTag
                checked={rootState.favoriteGroup === groupName}
                className={clsx({
                  "bg-red!": rootState.favoriteGroup === groupName,
                })}
                onChange={() => {
                  rootState.favoriteGroup = groupName;
                }}
              >
                {groupName}
              </Tag.CheckableTag>
            </div>
          ))}
        </Scrollbar>
      )}
    </div>
  );
};

export default GroupList;
