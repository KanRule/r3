package scheduler

import (
	"encoding/json"
	"fmt"
	"r3/cache"
	"r3/cluster"
	"r3/db"
	"r3/log"
	"r3/types"
	"syscall"

	"github.com/gofrs/uuid"
)

// collect cluster events from shared database for node to react to
func clusterProcessEvents() error {

	rows, err := db.Pool.Query(db.Ctx, `
		SELECT content, payload,
			COALESCE(target_address, ''),
			COALESCE(target_device, ''),
			COALESCE(target_login_id, 0)
		FROM instance_cluster.node_event
		WHERE node_id = $1
	`, cache.GetNodeId())
	if err != nil {
		return err
	}

	events := make([]types.ClusterEvent, 0)
	for rows.Next() {
		var e types.ClusterEvent
		if err := rows.Scan(&e.Content, &e.Payload, &e.Target.Address,
			&e.Target.Device, &e.Target.LoginId); err != nil {

			return err
		}
		events = append(events, e)
	}
	rows.Close()

	// no events, nothing to do
	if len(events) == 0 {
		return nil
	}

	// delete collected events
	if _, err := db.Pool.Exec(db.Ctx, `
		DELETE FROM instance_cluster.node_event
		WHERE node_id = $1
	`, cache.GetNodeId()); err != nil {
		return err
	}

	// react to collected events
	for _, e := range events {
		log.Info("cluster", fmt.Sprintf("node is reacting to event '%s'", e.Content))
		var jsonPayload []byte

		switch v := e.Payload.(type) {
		case string:
			jsonPayload = []byte(v)
		}

		switch e.Content {
		case "collectionUpdated":
			var p types.ClusterEventCollectionUpdated
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			err = cluster.CollectionUpdated(p.CollectionId, p.LoginIds)
		case "configChanged":
			var switchToMaintenance bool
			if err := json.Unmarshal(jsonPayload, &switchToMaintenance); err != nil {
				return err
			}
			err = cluster.ConfigChanged(false, true, switchToMaintenance)
		case "loginDisabled":
			err = cluster.LoginDisabled(false, e.Target.LoginId)
		case "loginReauthorized":
			err = cluster.LoginReauthorized(false, e.Target.LoginId)
		case "loginReauthorizedAll":
			err = cluster.LoginReauthorizedAll(false)
		case "masterAssigned":
			var p types.ClusterEventMasterAssigned
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			err = cluster.MasterAssigned(p.State)
		case "schemaChanged":
			var moduleIds []uuid.UUID
			if err := json.Unmarshal(jsonPayload, &moduleIds); err != nil {
				return err
			}
			err = cluster.SchemaChanged(false, moduleIds)
		case "tasksChanged":
			err = cluster.TasksChanged(false)
		case "taskTriggered":
			var p types.ClusterEventTaskTriggered
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			runTaskDirectly(p.TaskName, p.PgFunctionId, p.PgFunctionScheduleId)
		case "shutdownTriggered":
			OsExit <- syscall.SIGTERM

		// device events
		case "deviceBrowserApplyCopiedFiles":
			var p types.ClusterEventDeviceBrowserApplyCopiedFiles
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			err = cluster.DeviceBrowserApplyCopiedFiles(false, e.Target.Address,
				e.Target.LoginId, p.AttributeId, p.FileIds, p.RecordId)
		case "deviceBrowserCallJsFunction":
			var p types.ClusterEventDeviceBrowserCallJsFunction
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			err = cluster.DeviceBrowserCallJsFunction(false, e.Target.Address,
				e.Target.LoginId, p.JsFunctionId, p.Arguments)
		case "deviceFatClientRequestFile":
			var p types.ClusterEventDeviceFatClientRequestFile
			if err := json.Unmarshal(jsonPayload, &p); err != nil {
				return err
			}
			err = cluster.DeviceFatClientRequestFile(false, e.Target.Address,
				e.Target.LoginId, p.AttributeId, p.FileId, p.FileHash, p.FileName,
				p.ChooseApp)
		}
		if err != nil {
			return err
		}
	}
	return nil
}
